/* eslint-disable @typescript-eslint/no-this-alias */
// 该插件收集各种cgi请求的日志
import Core, {
  SpeedLog,
  NormalLog,
  LogType,
  Config,
  Plugin,
  formatUrl,
  urlIsHttps,
  isRequestAsset,
  tryToGetRetCode,
  ReportDefaultVal,
  formatApiDetail,
  RESOURCE_TYPE,
  isIgnoreUrl,
} from 'aegis-core';

import {
  WeexFetchResponse,
  wrapResponse,
} from '../fetch-proxy';

interface WeexCore extends Core {
  fetch: Function;
  weexFetch: Function;
}

interface ResponseHandler {
  then?: (res: Response, duration: number, url: string, option?: RequestInit) => void;
  catch?: (err: any, duration: number, url: string, option?: RequestInit) => void;
}

export default new Plugin({
  name: 'reportApiSpeed',
  override: false,
  fetch: null,
  weexFetch: null,
  onNewAegis(aegis: WeexCore) {
    // 按照第一个实例的配置来覆写
    if (!this.override) {
      this.override = true;
      this.fetch = aegis.fetch;
      this.weexFetch = aegis.weexFetch;

      const { fetch, weexFetch } = this.overrideFetch(aegis.config);
      aegis.fetch = fetch;
      aegis.weexFetch = weexFetch;
    }
  },
  // 测速数据
  publishSpeed(log: SpeedLog) {
    this.$walk((aegis: Core) => {
      aegis.speedLogPipeline(log);
    });
  },
  // 日志数据
  publishNormalLog(log: NormalLog) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(log);
    });
  },
  // 覆写fetch
  overrideFetch(config: Config) {
    if (typeof this.fetch !== 'function') return;
    const originFetch = this.fetch;
    const originWeexFetch = this.weexFetch;
    const responseHandler: ResponseHandler = {
      then: (res, duration, url, option) => {
        if (isIgnoreUrl(url, config.hostUrl)) {
          return;
        }
        // 测速日志
        const speedLog: SpeedLog = {
          url,
          isHttps: urlIsHttps(url),
          method: option?.method || 'get',
          duration,
          nextHopProtocol: '',
          type: 'fetch',
          status: res.status,
        };

        let type;
        if (typeof config.api?.resourceTypeHandler === 'function') {
          type = config.api?.resourceTypeHandler(res.url);
        }
        // 如果用户返回的值不满足条件，重新计算
        if (RESOURCE_TYPE.indexOf(type) === -1) {
          // 请求失败时content-type经常会是text/plain，所以当失败时一律认为是cgi请求
          const contentType = (res.headers && res.headers.get('content-type')) || '';
          type = !res.ok || !isRequestAsset(contentType, url) ? 'fetch' : 'static';
        }
        if (type === 'fetch') {
          // cgi
          res
            .clone()
            .text()
            .then((data: string) => {
              // 不存在还是走之前逻辑
              const { code, isErr } = tryToGetRetCode(data, config.api, {
                url: res.url,
                ctx: res,
                payload: option?.body,
              }) || {};

              const apiDetail = config.api?.apiDetail;
              // 获取上报 request param
              const paramsTxt = apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

              // 获取上报 response body
              const bodyTxt = apiDetail ? formatApiDetail(data, config.api?.resBodyHandler, { url }) : '';

              const apiDesc = `req url: ${url} 
                              \nres status: ${res.status || 0}
                              \nres duration: ${duration}ms 
                              \nreq method: ${option?.method || 'get'} 
                              \nreq param: ${paramsTxt} 
                              \nres retcode: ${code}
                              \nres data: ${bodyTxt}`;
              // 白名单上报接口返回数据
              this.publishNormalLog({
                msg: apiDesc,
                level: LogType.API_RESPONSE,
              });

              speedLog.payload = option?.body;
              speedLog.ret = code;
              speedLog.isErr = +isErr;
              // 上报retcode错误日志
              isErr && this.publishNormalLog({
                msg: apiDesc,
                level: LogType.RET_ERROR,
              });
            });
        } else {
          // 静态资源
          Object.assign(speedLog, {
            type: 'static',
            urlQuery: formatUrl(res.url, true),
            domainLookup: ReportDefaultVal.number as number,
            connectTime: ReportDefaultVal.number as number,
          });
        }
        // 上报测速日志
        this.publishSpeed(speedLog);
      },
      catch: (err, duration, url, option) => {
        if (isIgnoreUrl(url, config.hostUrl)) {
          // 原封不动继续抛出err
          throw err;
        }
        // 发生错误：跨域、链接有错
        const log: SpeedLog = {
          url,
          isHttps: urlIsHttps(url as string),
          method: option?.method || 'get',
          duration,
          nextHopProtocol: '',
          type: 'fetch',
          status: 0,
        };
        this.publishSpeed(log);

        // 获取上报 request param
        const paramsTxt = config.api?.apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

        const apiDesc = `AJAX_ERROR: ${err}
              \nreq url: ${url}
              \nres status: 0
              \nres duration: ${duration}ms
              \nreq method: ${option?.method || 'get'}
              \nreq param: ${paramsTxt}`;
        // 上报接口错误数据
        this.publishNormalLog({
          msg: apiDesc,
          level: LogType.AJAX_ERROR,
        });
        // 原封不动继续抛出err
        throw err;
      },
    };
    const hackedFetch = (url: string, options: any) => {
      const startTime = Date.now();
      return originFetch(url, options)
        .then((res: Response) => {
          const duration = Date.now() - startTime;
          const response = res;
          try {
            typeof responseHandler.then === 'function'
              && responseHandler.then(response, duration, url, options);
          } catch (e) { }
          // 原封不动返回res
          return res;
        })
        .catch((err: any) => {
          const duration = Date.now() - startTime;
          try {
            typeof responseHandler.catch === 'function'
              && responseHandler.catch(err, duration, url, options);
          } catch (e) { }
          // 原封不动继续抛出err
          throw err;
        });
    };
    const hackedWeexFetch = (options: any, callback: Function, progressCallback: Function) => {
      const { url } = options;
      const startTime = Date.now();
      try {
        originWeexFetch(options, (res: WeexFetchResponse) => {
          const duration = Date.now() - startTime;
          const response: any = wrapResponse(res);
          try {
            typeof responseHandler.then === 'function'
              && responseHandler.then(response, duration, url, options);
          } catch (e) { }
          if (typeof callback === 'function') {
            callback(res);
          }
        }, progressCallback);
      } catch (err) {
        const duration = Date.now() - startTime;
        try {
          typeof responseHandler.catch === 'function'
            && responseHandler.catch(err, duration, url, options);
        } catch (e) { }
        // 原封不动继续抛出err
        throw err;
      }
    };
    return {
      fetch: hackedFetch,
      weexFetch: hackedWeexFetch,
    };
  },
});
