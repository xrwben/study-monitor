/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/prefer-for-of */
// 劫持XHR，执行注入的函数
export interface HackXHROptions {
  name: string;
  open?: (xhr: XMLHttpRequest) => void;
  send?: (xhr: XMLHttpRequest, body: any) => void;
}
let hasHackXHR = false;
const hackXHROptionsList: HackXHROptions[] = [];
export const hackXHR = function (options: HackXHROptions) {
  if (hackXHROptionsList.find(option => option.name === options.name)) {
    throw new Error(`name '${options.name}' is already in hackXHR option list`);
  }
  hackXHROptionsList.push(options);
  if (hasHackXHR || !window.XMLHttpRequest) return;
  hasHackXHR = true;

  const originSend = window.XMLHttpRequest.prototype.send;
  const originOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function aegisFakeOpen() {
    this.aegisMethod = arguments[0];
    this.aegisUrl = arguments[1];
    this.aegisXhrStartTime = Date.now();

    // Aegis自己发的请求不做操作
    if (!this.sendByAegis) {
      for (let i = 0; i < hackXHROptionsList.length; i++) {
        const options = hackXHROptionsList[i];
        try {
          typeof options.open === 'function' && options.open(this);
        } catch (e) { }
      }
    }

    return originOpen.apply(this, arguments);
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
};

// 劫持fetch，执行注入的函数
export interface HackFetchOptions {
  name: string;
  beforeFetch?: (url: string, option: RequestInit) => void;
  then?: (res: Response, duration: number, url: string, option?: RequestInit) => void;
  catch?: (err: any, duration: number, url: string, option?: RequestInit) => void;
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

  const originFetch = window.fetch;
  window.fetch = function aegisFakeFetch(url: RequestInfo, fetchOption = {}) {
    const fetchUrl = typeof url === 'string' ? url : url.url;
    for (let i = 0; i < hackFetchOptionsList.length; i++) {
      const option = hackFetchOptionsList[i];
      try {
        typeof option.beforeFetch === 'function' && option.beforeFetch(fetchUrl, fetchOption);
      } catch (e) { }
    }
    const sendTime = Date.now();
    return originFetch(url, fetchOption)
      .then((res) => {
        for (let i = 0; i < hackFetchOptionsList.length; i++) {
          const option = hackFetchOptionsList[i];
          try {
            typeof option.then === 'function'
              && option.then(res, Date.now() - sendTime, fetchUrl, fetchOption);
          } catch (e) { }
        }
        // 原封不动返回res
        return res;
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
};
