import Core, {
  Plugin,
  SpeedLog,
  NormalLog,
  LogType,
  Config,
  formatUrl,
  urlIsHttps,
  tryToGetRetCode,
  isRequestAsset,
  ReportDefaultVal,
  formatApiDetail,
  RESOURCE_TYPE,
  isIgnoreUrl,
} from 'aegis-core';
import { hackFetch } from '../util';
export default new Plugin({
  name: 'reportApiSpeed',
  override: false,
  onNewAegis(aegis: Core) {
    if (this.override) {
      return;
    }
    this.override = true;
    this.overrideFetch(aegis.config);
  },
  // 改写fetch
  overrideFetch(config: Config) {
    hackFetch({
      name: this.name,
      then: (res, duration, url, option) => {
        if (isIgnoreUrl(url, config.hostUrl)) return;

        // 测速日志
        const speedLog: SpeedLog = {
          url: res.url,
          isHttps: urlIsHttps(res.url),
          method: option?.method || 'get',
          duration,
          nextHopProtocol: '',
          type: 'fetch',
          status: res.status || 0,
        };

        let type;
        if (typeof config.api?.resourceTypeHandler === 'function') {
          type = config.api?.resourceTypeHandler(res.url);
        }
        // 如果用户返回的值不满足条件，重新计算
        if (RESOURCE_TYPE.indexOf(type) === -1) {
          // 请求失败时content-type经常会是text/plain，所以当失败时一律认为是cgi请求
          const contentType = (res.headers && res.headers.get('content-type')) || '';
          type = !res.ok || !isRequestAsset(contentType, speedLog.url) ? 'fetch' : 'static';
        }

        if (type === 'fetch') {
          // cgi
          res
            .clone()
            .text()
            .then((data: string) => {
              const isAjaxError = res.status <= 0 || res.status >= 400;
              const apiDetail = config.api?.apiDetail;
              // 获取上报 request param
              const paramsTxt = apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

              // 获取上报 response body
              const bodyTxt = apiDetail ? formatApiDetail(data, config.api?.resBodyHandler, { url }) : '';


              const { code, isErr } = tryToGetRetCode(data, config.api, { url, ctx: res, payload: option?.body });
              const apiDesc = `${isAjaxError ? `FETCH_ERROR: ${data} \n\n` : ''}req url: ${url} 
                              \nres status: ${res.status || 0} 
                              \nres duration: ${duration} 
                              \nreq method: ${option?.method || 'get'} 
                              \nreq param: ${paramsTxt} 
                              \nres retcode: ${code}
                              \nres data: ${bodyTxt}`;
              speedLog.payload = option?.body;
              speedLog.ret = code;
              speedLog.isErr = +isErr;
              // 上报retcode错误日志
              this.publishNormalLog({
                msg: apiDesc,
                // eslint-disable-next-line no-nested-ternary
                level: isAjaxError ? LogType.AJAX_ERROR : (isErr ? LogType.RET_ERROR : LogType.API_RESPONSE),
                code,
              });
              // 上报测速日志
              this.publishSpeedLog(speedLog);
            });
        } else {
          // 静态资源
          Object.assign(speedLog, {
            type: 'static',
            urlQuery: formatUrl(res.url, true),
            domainLookup: ReportDefaultVal.number as number,
            connectTime: ReportDefaultVal.number as number,
          });
          // 上报测速日志
          this.publishSpeedLog(speedLog);
        }
      },
      catch: (err, duration, url, option) => {
        if (isIgnoreUrl(url, config.hostUrl)) return;

        // 发生错误
        const log: SpeedLog = {
          url,
          isHttps: urlIsHttps(url as string),
          method: option?.method || 'get',
          duration,
          nextHopProtocol: '',
          type: 'fetch',
          status: 0,
        };

        this.publishSpeedLog(log);
        // 获取上报 request param
        const paramsTxt = config.api?.apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

        const apiDesc = `AJAX_ERROR: ${err}
                        \nreq url: ${url}
                        \nres status: 0
                        \nres duration: ${duration}
                        \nreq method: ${option?.method || 'get'}
                        \nreq param: ${paramsTxt}`;
        // 上报接口错误数据
        this.publishNormalLog({
          msg: apiDesc,
          level: LogType.AJAX_ERROR,
          code: -400,
        });
        throw err;
      },
    });
  },


  publishSpeedLog(log: SpeedLog) {
    this.$walk((aegis: Core) => {
      aegis.speedLogPipeline(log);
    });
  },

  publishNormalLog(log: NormalLog) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(log);
    });
  },
});
