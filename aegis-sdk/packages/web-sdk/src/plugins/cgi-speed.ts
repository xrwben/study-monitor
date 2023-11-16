/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/prefer-for-of */
// 该插件收集各种cgi请求的日志
import {
  Plugin,
  SpeedLog,
  NormalLog,
  LogType,
  formatUrl,
  urlIsHttps,
  isRequestAsset,
  tryToGetRetCode,
  tryToGetRetCodeAsync,
  ReportDefaultVal,
  getReportVal,
  formatApiDetail,
  RESOURCE_TYPE,
  isIgnoreUrl,
} from 'aegis-core';
import {
  hackXHR,
  hackFetch,
  unHackXHR,
  unHackFetch,
  HackFetchOptions,
  HackXHROptions,
  getRequestHeaders,
  responseHeadersString2Obj,
} from '../util/hack-http';

import {
  TraceRequestHeader,
  parseNormalTraceRequestHeader,
} from '../util/trace';

import Aegis, { WebConfig } from '../aegis';

import {
  XHR_FAIL_TYPE_ABORT,
  XHR_FAIL_TYPE_ERROR,
  XHR_FAIL_TYPE_TIMEOUT,
} from '../constant/index';

let plugin = new Plugin({ name: 'reportApiSpeed' });

if (CGI_SPEED) {
  plugin = new Plugin({
    name: 'reportApiSpeed',
    override: false,

    onNewAegis(aegis: Aegis) {
      if (!this.override) {
        const { api } = aegis.config as WebConfig;
        if (api?.injectTraceHeader) {
          this.traceRequestHeader = new TraceRequestHeader(
            api.injectTraceHeader,
            api?.injectTraceIgnoreUrls ?? [],
            api?.injectTraceUrls
          );
        }
        this.override = true;
        // 改写fetch、xhr获取cgi日志，同一个应用只需要重写一次
        this.overrideFetch(aegis.config, aegis);
        this.overrideXhr(aegis.config, aegis);
      }
    },
    // 获取文件类型，static fetch
    getRequestType(config: WebConfig, contentType = '', url: string) {
      let type = (typeof config.api?.resourceTypeHandler === 'function') ? config.api?.resourceTypeHandler(url) : '';
      // 如果用户返回的值不满足条件，重新计算
      if (RESOURCE_TYPE.indexOf(type) === -1) {
        // 根据content-type判断请求资源是静态资源还是cgi
        type = isRequestAsset(contentType, url) ? 'static' : 'fetch';
      }
      return type;
    },
    // 重写fetch方法
    overrideFetch(config: WebConfig, aegis: Aegis) {
      const { api } = config;

      const hackFetchOptions: HackFetchOptions = {
        name: this.name,
        traceRequestHeader: api?.injectTraceHeader ? this.traceRequestHeader : null,
        then: (res, duration, url, option) => {
          // 自身接口信息不上报
          if (isIgnoreUrl(url, config.hostUrl)) return;
          const contentType = res.headers ? res.headers.get('content-type') : '';
          const type = this.getRequestType(config, contentType, url);
          // duration 要异步获取，所以放在 setTimeout 中
          // 测速日志
          if (type === 'fetch') {
            // cgi
            res
              .clone()
              .text()
              .then((data: string) => {
                const isAjaxError = res.status <= 0 || res.status >= 400;
                // 获取上报 request headers
                const reqHeaders = config.api?.reqHeaders || [];
                const reportRequestHeadersTxt = getRequestHeaders(option?.headers, reqHeaders, 'req');

                // 获取上报 response headers
                const resHeaders = config.api?.resHeaders || [];
                const reportResponseHeadersTxt = getRequestHeaders(res.headers, resHeaders, 'res');

                // 从请求头中获取 traceId
                const trace = parseNormalTraceRequestHeader(option?.headers);

                const { code, isErr } = tryToGetRetCode(data, config.api, { url, ctx: res, payload: option?.body });
                const apiDetail = config.api?.apiDetail;
                // 获取上报 request param
                const paramsTxt = apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

                // 获取上报 response body
                const bodyTxt = apiDetail ? formatApiDetail(data, config.api?.resBodyHandler, { url, ctx: res }) : '';

                // duration 要异步获取，所以放在 setTimeout 中
                setTimeout(() => {
                  const speedLog: SpeedLog = this.getPerformanceEntryByUrl(
                    config,
                    {
                      url,
                      duration,
                      type,
                      status: res.status || 0,
                      method: option?.method || 'get',
                    }
                  );
                  const apiDesc = `${isAjaxError ? `FETCH_ERROR: ${data} \n\n` : ''}fetch req url: ${url} 
                    \nres status: ${res.status || 0} 
                    \nres duration: ${speedLog.duration}ms 
                    \nreq method: ${option?.method || 'get'} 
                    \nres retcode: ${code}
                    \nreq param: ${paramsTxt}
                    \nres data: ${bodyTxt}
                    ${reportRequestHeadersTxt}
                    ${reportResponseHeadersTxt}`;
                  speedLog.payload = option?.body;
                  speedLog.ret = code;
                  speedLog.isErr = +isErr;
                  // 上报retcode错误日志
                  this.publishNormalLog({
                    msg: apiDesc,
                    level: isAjaxError ? LogType.AJAX_ERROR : (isErr ? LogType.RET_ERROR : LogType.API_RESPONSE),
                    code,
                    trace,
                  }, aegis);
                  // 上报测速日志
                  this.publishSpeed(speedLog, aegis);
                }, 0);
              });
          } else {
            // duration 要异步获取，所以放在 setTimeout 中
            setTimeout(() => {
              const speedLog: SpeedLog = this.getPerformanceEntryByUrl(
                config,
                {
                  url,
                  duration,
                  type,
                  status: res.status || 0,
                  method: option?.method || 'get',
                }
              );
              // 静态资源
              speedLog.type = 'static';
              speedLog.urlQuery = formatUrl(url, true);
              // 上报测速日志
              this.publishSpeed(speedLog, aegis);
            }, 0);
          }
        },
        // abort 跨域逻辑代码会走到 catch 里面，这里无法判断出哪种是 abort，所以暂时不屏蔽
        catch: (err, duration, url, option) => {
          // 自身接口报错不上报
          if (isIgnoreUrl(url, config.hostUrl)) {
            // 原封不动继续抛出err
            throw err;
          }
          // 准备上报数据
          const type = this.getRequestType(config, '', url);
          // 获取上报 request headers
          const reqHeaders = config.api?.reqHeaders || [];
          const reportRequestHeadersTxt = getRequestHeaders(option?.headers, reqHeaders, 'req');
          // 从请求头中获取 traceId
          const trace = parseNormalTraceRequestHeader(option?.headers);
          // 获取上报 request param
          const paramsTxt = config.api?.apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

          // duration 要异步获取，所以放在 setTimeout 中
          setTimeout(() => {
            // 发生错误：跨域、链接有错
            const speedLog: SpeedLog = this.getPerformanceEntryByUrl(
              config,
              {
                url,
                duration,
                type,
                status: 0,
                method: option?.method || 'get',
              }
            );

            this.publishSpeed(speedLog, aegis);

            const apiDesc = `AJAX_ERROR: ${err}
                          \nreq url: ${url}
                          \nres status: 0
                          \nres duration: ${speedLog.duration}ms
                          \nreq method: ${option?.method || 'get'}
                          \nreq param: ${paramsTxt}
                          ${reportRequestHeadersTxt}`;
            // 上报接口错误数据
            this.publishNormalLog({
              msg: apiDesc,
              level: LogType.AJAX_ERROR,
              code: -400,
              trace,
            }, aegis);
          }, 0);

          // 原封不动继续抛出err
          throw err;
        },
      };
      this.hackFetchOptions = hackFetchOptions;
      hackFetch(this.hackFetchOptions);
    },
    // 重写XHR
    overrideXhr(config: WebConfig, aegis: Aegis) {
      const hackXHROptions: HackXHROptions = {
        name: this.name,
        send: (xhr, body) => {
          const sendTime = Date.now();
          const { injectTraceHeader } = config?.api || {};

          if (injectTraceHeader) {
            const { name, value } = this.traceRequestHeader.generate(xhr.aegisUrl) || {};
            name && value && xhr.setRequestHeader(name, value);
          }

          xhr.addEventListener('loadend', () => {
            const url = xhr.aegisUrl || '';
            // 如果用户修改原生xhr对象，会导致sendByAegis赋值失败，从而监控aegis自己url上报，会出现循环报错bug
            // abort 请求对于用户没有实际意义，这里对其上报进行屏蔽
            if (isIgnoreUrl(url, config.hostUrl) || xhr.failType === XHR_FAIL_TYPE_ABORT) return;

            let failType = '';
            // !status 表示为 0 或者 undefined
            if (xhr.failType || !xhr.status || xhr.status >= 400) {
              failType = xhr.failType || 'failed';
            }

            const duration = Date.now() - sendTime;
            // static fetch
            const contentType = xhr.getResponseHeader('content-type');
            const type = this.getRequestType(config, contentType, url);

            // duration 要异步获取，所以放在 setTimeout 中
            setTimeout(() => {
              const speedLog: SpeedLog = this.getPerformanceEntryByUrl(
                config,
                {
                  url,
                  duration,
                  type,
                  status: xhr.status,
                  method: xhr.aegisMethod || 'get',
                }
              );
              // cgi
              if (type === 'fetch') {
                // 获取上报 request headers
                const reqHeaders = config.api?.reqHeaders || [];
                const reportRequestHeadersTxt = getRequestHeaders(xhr.aegisXhrReqHeader, reqHeaders, 'req');

                // 获取上报 response headers
                const resHeaders = config.api?.resHeaders || [];
                const responseHeaderObj = responseHeadersString2Obj(xhr.getAllResponseHeaders());
                const reportResponseHeadersTxt = getRequestHeaders(responseHeaderObj, resHeaders, 'res');

                // 从请求头中获取 traceId
                const trace = parseNormalTraceRequestHeader(xhr.aegisXhrReqHeader);

                // 获取上报 request param
                const apiDetail = config.api?.apiDetail;
                const paramsTxt = apiDetail ? formatApiDetail(body, config.api?.reqParamHandler, { url }) : '';

                // 获取上报 response body
                const bodyTxt = apiDetail ? formatApiDetail(xhr.response, config.api?.resBodyHandler, { url }) : '';
                try {
                  tryToGetRetCodeAsync(xhr.response, config.api, { url, ctx: xhr, payload: body }, (data: any) => {
                    const { code, isErr } = data;
                    const apiDesc = `${failType ? `AJAX_ERROR: request ${failType} \n\n` : ''}fetch req url: ${url} 
                      \nres status: ${speedLog.status}
                      \nres duration: ${speedLog.duration}ms
                      \nreq method: ${speedLog.method}
                      \nres retcode: ${code}
                      \nreq param: ${paramsTxt}
                      \nres data: ${bodyTxt}
                      ${reportRequestHeadersTxt}
                      ${reportResponseHeadersTxt}`;
                    speedLog.ret = code;
                    speedLog.isErr = +isErr;
                    speedLog.payload = body;
                    // 上报 API 日志
                    this.publishNormalLog({ // 白名单用户上报请求详情
                      msg: apiDesc,
                      level: failType ? LogType.AJAX_ERROR : (isErr ? LogType.RET_ERROR : LogType.API_RESPONSE),
                      code,
                      trace,
                    }, aegis);
                    this.publishSpeed(speedLog, aegis);
                  });
                } catch (e) {
                  speedLog.ret = 'unknown';
                  this.publishSpeed(speedLog, aegis);
                }
              } else { // 静态资源
                speedLog.type = 'static';
                speedLog.urlQuery = formatUrl(url, true);
                this.publishSpeed(speedLog, aegis);
              }
            }, 0);
          });
          [XHR_FAIL_TYPE_ABORT, XHR_FAIL_TYPE_ERROR, XHR_FAIL_TYPE_TIMEOUT].map((failType): void => {
            xhr.addEventListener(failType, () => {
              xhr.failType = failType;
            });
            return;
          });
        },
      };
      this.hackXHROptions = hackXHROptions;
      hackXHR(this.hackXHROptions);
    },
    // 从 performance 中获取接口真实耗时
    getPerformanceEntryByUrl(config: WebConfig, defaultValue: {
      url: string,
      duration: number,
      type: 'static' | 'fetch',
      status: number,
      method: string,
    }): SpeedLog {
      if (config.api?.usePerformanceTiming && typeof defaultValue.url === 'string') {
        const curEntry = performance.getEntriesByName(defaultValue.url)?.pop() as PerformanceResourceTiming;
        if (curEntry) {
          return {
            url: defaultValue.url,
            isHttps: urlIsHttps(defaultValue.url as string),
            method: defaultValue.method,
            type: defaultValue.type,
            status: defaultValue.status,
            duration: Number(curEntry.duration.toFixed(2)),
            nextHopProtocol: curEntry.nextHopProtocol || '',
            domainLookup: getReportVal(curEntry.domainLookupEnd - curEntry.domainLookupStart) as number,
            connectTime: getReportVal(curEntry.connectEnd - curEntry.connectStart) as number,
          };
        }
      }
      // 获取不到就返回默认值
      return {
        url: defaultValue.url,
        isHttps: urlIsHttps(defaultValue.url as string),
        method: defaultValue.method,
        type: defaultValue.type,
        status: defaultValue.status,
        duration: Number(defaultValue.duration.toFixed(2)),
        nextHopProtocol: '',
        domainLookup: ReportDefaultVal.number as number,
        connectTime: ReportDefaultVal.number as number,
      };
    },
    // 分发测速日志
    publishSpeed(log: SpeedLog) {
      this.$walk((aegis: Aegis) => {
        // 所有实例只会被hack一次，这里要全量执行
        // if (aegis !== instance) return;
        const pluginConfig = this.$getConfig(aegis);
        // restful风格的接口可以用这个方法来聚合
        if (log.type === 'fetch' && pluginConfig && typeof pluginConfig.urlHandler === 'function') {
          aegis.speedLogPipeline({
            ...log,
            url: formatUrl(pluginConfig.urlHandler(log.url, log.payload)),
          });
          return;
        }
        // 去掉query部分
        log.url = formatUrl(log.url);
        aegis.speedLogPipeline(log);
      });
    },
    // 分发api返回值
    publishNormalLog(log: NormalLog) {
      this.$walk((aegis: Aegis) => {
        // 所有实例只会被hack一次，这里要全量执行
        // if (aegis !== instance) return;
        aegis.normalLogPipeline(log);
      });
    },
    destroy() {
      this.option.publishSpeed = function () { };
      this.option.publishNormalLog = function () { };
      this.option.hackXHROptions && unHackXHR(this.option.hackXHROptions);
      this.option.hackFetchOptions && unHackFetch(this.option.hackFetchOptions);
      this.option.override = false;
    },
  });
}

export default plugin;
