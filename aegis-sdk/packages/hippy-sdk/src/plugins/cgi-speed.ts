/* eslint-disable @typescript-eslint/no-this-alias */
// 该插件收集各种cgi请求的日志
import Core, {
  SpeedLog,
  NormalLog,
  LogType,
  StaticAssetsLog,
  Config,
  Plugin,
  formatUrl,
  urlIsHttps,
  isRequestAsset,
  tryToGetRetCode,
  ReportDefaultVal,
  formatApiDetail,
  isIgnoreUrl,
} from 'aegis-core';
export default new Plugin({
  name: 'reportApiSpeed',
  override: false,
  onNewAegis(aegis: Core) {
    // 按照第一个实例的配置来覆写
    if (!this.override) {
      this.override = true;
      this.overrideFetch(aegis.config);
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
    if (typeof fetch !== 'function') return;
    const originFetch = fetch;
    const self = this;
    // @ts-ignore
    fetch = function aegisFakeFetch(url: string, option) {
      const apiDetail = config.api?.apiDetail;
      const sendTime = Date.now();
      return originFetch(url, option)
        .then((res) => {
          if (isIgnoreUrl(url, config.hostUrl)) return;
          try {
            // hippy 2.x版本，安卓返回是数组，iOS是字符串；3.x无此情况
            const contentTypeFromResHeaders: string[] | string = res.headers?.['Content-Type'] || res.headers?.['content-type'];
            const resContentTypeHeaders: string[] | string = contentTypeFromResHeaders ?? '';
            const resContentType: string = (Array.isArray(resContentTypeHeaders) ? resContentTypeHeaders[0] : resContentTypeHeaders) ?? '';
            const contentTypeFromReqHeaders: string = option?.headers?.['Content-Type'] || option?.headers?.['content-type'];
            const reqContentType: string = contentTypeFromReqHeaders ?? '';
            const isResponseJson: boolean = resContentType.toLowerCase().indexOf('application/json') >= 0; // 响应是否为json类型
            // 请求contentType或者响应contentType有一个为json则可以认为是普通json请求
            const isJsonRequest: boolean = isResponseJson || reqContentType.toLowerCase().indexOf('application/json') >= 0; // 是否是json类型的请求
            // 请求失败时content-type经常会是text/plain，所以当失败时一律认为是cgi请求
            if (!res.ok || !isRequestAsset(resContentType, url) || isJsonRequest) {
              // cgi请求， hippy的fetch没有clone方法，.text 可以获取到原始数据
              res.text().then((data: string) => {
                // 上报接口返回数据
                const duration = Date.now() - sendTime;
                const isAjaxError = res.status <= 0 || res.status >= 400;
                const { code, isErr } = tryToGetRetCode(data, config.api, {
                  url,
                  ctx: res,
                  payload: option?.body,
                }) || {};

                // 获取上报 request param
                const paramsTxt = apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

                // 获取上报 response body
                const bodyTxt = apiDetail ? formatApiDetail(data, config.api?.resBodyHandler, { url }) : '';

                const apiDesc = `${isAjaxError ? `FETCH_ERROR: ${data} \n\n` : ''}req url: ${url} 
                                \nres status: ${res.status || 0}
                                \nres duration: ${duration}ms
                                \nreq method: ${option?.method || 'get'} 
                                \nreq param: ${paramsTxt}
                                \nres retcode: ${code || 'unknown'}
                                \nres data: ${bodyTxt}`;
                self.publishNormalLog({
                  msg: apiDesc,
                  // eslint-disable-next-line no-nested-ternary
                  level: isAjaxError ? LogType.AJAX_ERROR : (isErr ? LogType.RET_ERROR : LogType.API_RESPONSE),
                  code,
                  ctx: res,
                });
                const log: SpeedLog = {
                  url: formatUrl(url),
                  isHttps: urlIsHttps(url),
                  method: option?.method || 'get',
                  duration,
                  type: 'fetch',
                  nextHopProtocol: '',
                  ret: code || 'unknown',
                  isErr: +isErr,
                  status: res.status,
                  payload: option?.body,
                };
                self.publishSpeed(log);
              });
            } else {
              // 静态资源
              const log: StaticAssetsLog = {
                url: formatUrl(url),
                isHttps: urlIsHttps(url),
                method: option?.method || 'get',
                duration: Date.now() - sendTime,
                type: 'static',
                status: res.status,
                nextHopProtocol: '',
                urlQuery: formatUrl(url, true),
                domainLookup: ReportDefaultVal.number as number,
                connectTime: ReportDefaultVal.number as number,
              };
              // 上报测速日志
              self.publishSpeed(log);
            }
          } catch (e) { }
          // 原封不动返回res
          return res;
        })
        .catch((err) => {
          // sdk 自身接口信息不收集
          if (isIgnoreUrl(url, config.hostUrl)) {
            // 原封不动继续抛出err
            throw err;
          }
          // 发生错误：跨域、链接有错、
          const duration = Date.now() - sendTime;
          const log: SpeedLog = {
            url: formatUrl(url as string),
            isHttps: urlIsHttps(url as string),
            method: option?.method || 'get',
            duration,
            nextHopProtocol: '',
            type: 'fetch',
            status: 0,
          };
          self.publishSpeed(log);

          // 获取上报 request param
          const paramsTxt = apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

          const apiDesc = `AJAX_ERROR: ${err}
                          \nreq url: ${url}
                          \nres status: 0
                          \nres duration: ${duration}ms
                          \nreq method: ${option?.method || 'get'}
                          \nreq param: ${paramsTxt}`;
          // 上报接口错误数据
          self.publishNormalLog({
            msg: apiDesc,
            level: LogType.AJAX_ERROR,
          });
          // 原封不动继续抛出err
          throw err;
        });
    };
  },
});
