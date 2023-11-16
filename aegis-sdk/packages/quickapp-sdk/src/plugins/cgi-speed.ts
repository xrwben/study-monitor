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

interface QuickappCore extends Core {
  originRequest: Function;
  aegisFetch: Function;
}
// 缓存原始fetch请求，Aegis上报走原始请求
export default new Plugin({
  name: 'reportApiSpeed',
  override: false,
  fetch: null,
  onNewAegis(aegis: QuickappCore) {
    this.fetch = aegis.originRequest;
    // 按照第一个实例的配置来覆写
    if (!this.override) {
      this.override = true;
      aegis.aegisFetch = this.overrideFetch(aegis.config);
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
    const self = this;
    // @ts-ignore
    this.fetch = function aegisFakeFetch(quickappFetchObject) {
      const { url, ...option } = quickappFetchObject;
      const sendTime = Date.now();
      return originFetch(url, option)
        .then((res: { headers: { [x: string]: any; }; statusText: string; data: any; code: number }) => {
          if (isIgnoreUrl(url, config.hostUrl)) return;
          try {
            // @ts-ignore
            const contentType = res.headers ? res.headers['Content-Type'] : '';
            // 请求失败时content-type经常会是text/plain，所以当失败时一律认为是cgi请求
            if (
              res.statusText === 'OK' || !isRequestAsset(contentType, url)
            ) {
              // cgi请求 上报接口返回数据
              const { data } = res;
              self.publishNormalLog({
                msg: `${url} ${data}`,
                level: LogType.API_RESPONSE,
              });
              const { code, isErr } = tryToGetRetCode(data, config.api, { url, ctx: res, payload: option.body }) || {};
              const log: SpeedLog = {
                url: formatUrl(url),
                isHttps: urlIsHttps(url),
                method: (option?.method) || 'get',
                duration: Date.now() - sendTime,
                type: 'fetch',
                nextHopProtocol: '',
                ret: code || 'unknown',
                isErr: +isErr,
                status: res.code,
                payload: option.body,
              };
              // 上报测速日志
              self.publishSpeed(log);
              // 上报 retcode 非 0
              if (isErr) {
                self.publishNormalLog({
                  msg: `request url: ${url} \n response: ${data}`,
                  level: LogType.RET_ERROR,
                });
              }
            } else {
              // 静态资源
              const log: StaticAssetsLog = {
                url: formatUrl(url),
                isHttps: urlIsHttps(url),
                method: (option?.method) || 'get',
                duration: Date.now() - sendTime,
                type: 'static',
                status: res.code,
                urlQuery: formatUrl(url, true),
                domainLookup: ReportDefaultVal.number as number,
                connectTime: ReportDefaultVal.number as number,
              };
              // 上报测速日志
              self.publishSpeed(log);
            }
          } catch (e) { }

          // 原封不动返回res
          if (option.success && typeof option.success === 'function') {
            return option.success(res);
          }
          return res;
        })
        .catch((err: any) => {
          if (isIgnoreUrl(url, config.hostUrl)) return;
          // 发生错误：跨域、链接有错
          const duration = Date.now() - sendTime;
          const log: SpeedLog = {
            url: formatUrl(url as string),
            isHttps: urlIsHttps(url as string),
            method: (option?.method) || 'get',
            duration,
            nextHopProtocol: '',
            type: 'fetch',
            status: 0,
          };
          self.publishSpeed(log);

          // 获取上报 request param
          const paramsTxt = config.api?.apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

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
          // 原封不动返回res
          if (option.fail && typeof option.fail === 'function') {
            return option.fail(err);
          }
          throw err;
        });
    };
    return this.fetch;
  },
});
