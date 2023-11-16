/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/prefer-for-of */
// 劫持XHR，执行注入的函数
import {
  REPORT_TIMEOUT,
} from 'aegis-core';
import { device } from '../util/device-type';
import { isTraceHeader, TraceRequestHeader } from './trace';

export interface HackXHROptions {
  name: string;
  open?: (xhr: XMLHttpRequest) => void;
  send?: (xhr: XMLHttpRequest, body: any) => void;
}
let hasHackXHR = false;
const hackXHROptionsList: HackXHROptions[] = [];
const shortUrlReg = /^\/[^/]/;

let originSend: typeof window.XMLHttpRequest.prototype.send;
let originOpen: typeof window.XMLHttpRequest.prototype.open;
let originSetRequestHeader: typeof window.XMLHttpRequest.prototype.setRequestHeader;

let originFetch: typeof window.fetch;

export const hackXHR = function (options: HackXHROptions) {
  if (hackXHROptionsList.find(option => option.name === options.name)) {
    return; // 此处不该报错，否则多实例aegis必然会出错
    // throw new Error(`name '${options.name}' is already in hackXHR option list`);
  }
  hackXHROptionsList.push(options);
  if (hasHackXHR || !window.XMLHttpRequest) return;

  originSend = window.XMLHttpRequest.prototype.send;
  originOpen = window.XMLHttpRequest.prototype.open;
  originSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;

  hasHackXHR = true;

  window.XMLHttpRequest.prototype.open = function aegisFakeOpen() {
    this.aegisMethod = arguments[0];
    let aegisUrl = arguments[1];

    // 如果用户接口以单/开头，则自动补充 location.origin
    // @todo，这里没有兼容 // 开头的请求，是因为发现chrome浏览器会在请求域名后面加上/，但是无法确定是否所有浏览器都有这样的行为
    if (shortUrlReg.test(aegisUrl)) {
      aegisUrl = `${location.origin}${aegisUrl}`;
    }

    this.aegisUrl = aegisUrl;
    this.aegisXhrStartTime = Date.now();
    // Aegis自己发的请求不做操作
    if (!this.sendByAegis) {
      for (let i = 0; i < hackXHROptionsList.length; i++) {
        const options = hackXHROptionsList[i];
        try {
          typeof options.open === 'function' && options.open(this);
        } catch (e) { }
      }
    } else if (!device.isIE()) {
      this.timeout = REPORT_TIMEOUT;
    }

    return originOpen.apply(this, arguments);
  };

  window.XMLHttpRequest.prototype.setRequestHeader = function aegisFakeXHRSetRequestHeader() {
    const requestHeaderKey = arguments[0];
    const requestHeaderValue = arguments[1];

    this.aegisXhrReqHeader = this.aegisXhrReqHeader ?? {};

    if (isTraceHeader(requestHeaderKey)) {
      if (!this.aegisXhrReqHeader[requestHeaderKey]) {
        arguments[1] = requestHeaderValue;
      }

      if (this.aegisXhrReqHeader[requestHeaderKey]) {
        return;
      }
    }

    this.aegisXhrReqHeader[requestHeaderKey] = arguments[1];

    return originSetRequestHeader.apply(this, arguments);
  };

  window.XMLHttpRequest.prototype.send = function aegisFakeSend() {
    // Aegis自己发的请求不做操作
    if (!this.sendByAegis) {
      for (let i = 0; i < hackXHROptionsList.length; i++) {
        const options = hackXHROptionsList[i];
        try {
          typeof options.send === 'function' && options.send(this, arguments[0]);
        } catch (e) { }
      }
    }
    return originSend.apply(this, arguments);
  };
};

export const unHackXHR = function (options: HackXHROptions) {
  const index = hackXHROptionsList.findIndex(option => option.name === options.name);
  if (index !== -1) {
    hackXHROptionsList.splice(index, 1);
  }

  // window.XMLHttpRequest.prototype.send = originSend;
  // window.XMLHttpRequest.prototype.open = originOpen;
  // window.XMLHttpRequest.prototype.setRequestHeader = originSetRequestHeader;

  // hasHackXHR = false;
};

// 劫持fetch，执行注入的函数
export interface HackFetchOptions {
  name: string;
  traceRequestHeader?: TraceRequestHeader;
  beforeFetch?: (url: string, option: RequestInit) => void;
  then?: (res: Response, duration: number, url: string, option?: RequestInit, headers?: HeadersInit) => void;
  catch?: (err: any, duration: number, url: string, option?: RequestInit, headers?: HeadersInit) => void;
}
let alreadyHackFetch = false;
const hackFetchOptionsList: HackFetchOptions[] = [];

export const hackFetch = function (options: HackFetchOptions) {
  if (hackFetchOptionsList.find(option => option.name === options.name)) {
    throw new Error(`name '${options.name}' is already in hackFetch option list`);
  }
  hackFetchOptionsList.push(options);
  if (alreadyHackFetch || !window.fetch) return;
  alreadyHackFetch = true;

  originFetch = window.fetch;
  window.fetch = function aegisFakeFetch(url: RequestInfo, fetchOption = {}) {
    let fetchUrl = typeof url === 'string' ? url : url?.url;
    // 如果用户接口以单/开头，则自动补充 location.origin
    // @todo，这里没有兼容 // 开头的请求，是因为发现chrome浏览器会在请求域名后面加上/，但是无法确定是否所有浏览器都有这样的行为
    if (shortUrlReg.test(fetchUrl)) {
      fetchUrl = `${location.origin}${fetchUrl}`;
    }

    const { traceRequestHeader } = options || {};
    if (traceRequestHeader) {
      const { headers = {} } = fetchOption || {};
      const { name, value } = traceRequestHeader.generate(fetchUrl, headers) || {};

      value && name && (fetchOption.headers = Object.assign(headers, { [name]: value }));
    }

    for (let i = 0; i < hackFetchOptionsList.length; i++) {
      const option = hackFetchOptionsList[i];
      try {
        typeof option.beforeFetch === 'function' && option.beforeFetch(fetchUrl, fetchOption);
      } catch (e) { }
    }
    const sendTime = Date.now();

    return originFetch(url, fetchOption)
      .then((res) => {
        const resClone = res.clone();

        for (let i = 0; i < hackFetchOptionsList.length; i++) {
          const option = hackFetchOptionsList[i];
          try {
            typeof option.then === 'function'
              && option.then(resClone, Date.now() - sendTime, fetchUrl, fetchOption);
          } catch (e) { }
        }

        // 原封不动返回res
        return resClone;
      })
      .catch((err) => {
        for (let i = 0; i < hackFetchOptionsList.length; i++) {
          const option = hackFetchOptionsList[i];
          try {
            typeof option.catch === 'function'
              && option.catch(err, Date.now() - sendTime, fetchUrl, fetchOption);
          } catch (e) { }
        }
        // 原封不动继续抛出err
        throw err;
      });
  };
};

export const unHackFetch = function (options: HackFetchOptions) {
  const index = hackFetchOptionsList.findIndex(option => option.name === options.name);
  if (index !== -1) {
    hackFetchOptionsList.splice(index, 1);
  }
  // window.fetch = originFetch;

  // unhack后将flag置为初始态
  // alreadyHackFetch = false;
};

// 字符串转对象
export const responseHeadersString2Obj = function (allResponseHeaders: string): Record<string, string> {
  const arr = allResponseHeaders.split('\r\n');
  return arr.reduce((acc: Record<string, string>, current) => {
    const parts = current.split(': ');
    // 全部转化为小写
    if (parts[0] && parts[1]) {
      acc[parts[0]] = parts[1];
    }
    return acc;
  }, {});
};

// 获取 request 和 response header
export const getRequestHeaders = function (headers: HeadersInit | undefined, reqHeaders: string[], tag: string) {
  return reqHeaders?.length && typeof headers === 'object'
    ? reqHeaders.reduce((result: string, current: keyof HeadersInit) => {
      const value = (headers instanceof Headers) ? headers.get(current) : headers[current];
      if (value) {
        const lineTxt = `${result === '' ? '\n' : '\n\n'}${tag} header ${current}: ${value}`;
        return result + lineTxt;
      }
      return result;
    }, '') : '';
};
