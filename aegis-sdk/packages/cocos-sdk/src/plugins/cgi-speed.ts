// 该插件收集各种cgi请求的日志
import Core, {
  Plugin,
  SpeedLog,
  NormalLog,
  LogType,
  Config,
  formatUrl,
  urlIsHttps,
  isRequestAsset,
  tryToGetRetCode,
  formatApiDetail,
  ReportDefaultVal,
  RESOURCE_TYPE,
  isIgnoreUrl,
} from 'aegis-core';
import { hackFetch, unHackFetch, HackFetchOptions } from '../util/hack-http';

let plugin = new Plugin({ name: 'reportApiSpeed' });

if (CGI_SPEED) {
  plugin = new Plugin({
    name: 'reportApiSpeed',
    override: false,
    onNewAegis(aegis: Core) {
      if (!this.override) {
        this.override = true;
        // 改写fetch、xhr获取cgi日志，同一个应用只需要重写一次
        this.overrideFetch(aegis.config);
      }
    },
    // 重写fetch方法
    overrideFetch(config: Config) {
      const hackFetchOptions: HackFetchOptions = {
        name: this.name,
        then: (res, duration, url, option) => {
          // 自身接口信息不上报
          if (isIgnoreUrl(url, config.hostUrl)) return;
          // 测速日志
          const speedLog: SpeedLog = {
            url,
            isHttps: urlIsHttps(url),
            method: option?.method || 'get',
            duration,
            nextHopProtocol: '',
            type: 'fetch',
            status: res.status || 0,
          };

          let type;
          if (typeof config.api?.resourceTypeHandler === 'function') {
            type = config.api?.resourceTypeHandler(url);
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
                const isAjaxError = res.status <= 0 || res.status >= 400;
                const apiDetail = config.api?.apiDetail;
                // 获取上报 request param
                const paramsTxt = apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

                // 获取上报 response body
                const bodyTxt = apiDetail ? formatApiDetail(data, config.api?.reqParamHandler, { url }) : '';


                const apiDesc = `${isAjaxError ? `FETCH_ERROR: ${data} \n\n` : ''}req url: ${url} 
                                \nres status: ${res.status || 0} 
                                \nres duration: ${duration}ms
                                \nreq method: ${option?.method || 'get'} 
                                \nreq param: ${paramsTxt} 
                                \nres data: ${bodyTxt}`;

                // 白名单上报接口返回数据
                this.publishNormalLog({
                  msg: apiDesc,
                  level: isAjaxError ? LogType.AJAX_ERROR : LogType.API_RESPONSE,
                });

                speedLog.payload = option?.body;
                const { code, isErr } = tryToGetRetCode(data, config.api, {
                  url,
                  ctx: res,
                  payload: speedLog.payload,
                });
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
                this.publishSpeed(speedLog);
              });
          } else {
            // 静态资源
            Object.assign(speedLog, {
              type: 'static',
              urlQuery: formatUrl(url, true),
              domainLookup: ReportDefaultVal.number as number,
              connectTime: ReportDefaultVal.number as number,
            });
            // 上报测速日志
            this.publishSpeed(speedLog);
          }
        },
        catch: (err, duration, url, option) => {
          // 自身接口报错不上报
          if (isIgnoreUrl(url, config.hostUrl)) return;

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
            code: -400,
          });
          // 原封不动继续抛出err
          throw err;
        },
      };
      this.hackFetchOptions = hackFetchOptions;
      hackFetch(this.hackFetchOptions);
    },
    getRequestType(config: Config, xhr: XMLHttpRequest, url: string) {
      let type = (typeof config.api?.resourceTypeHandler === 'function') ? config.api?.resourceTypeHandler(url) : '';

      if (RESOURCE_TYPE.indexOf(type) === -1) {
        // 根据content-type判断请求资源是静态资源还是cgi
        // 请求失败时content-type经常会是text/plain，所以当失败时一律认为是cgi请求
        const contentType = xhr.getResponseHeader('content-type') || '';
        type = xhr.status >= 400 || !isRequestAsset(contentType, url) ? 'fetch' : 'static';
      }
      return type;
    },
    // 分发测速日志
    publishSpeed(log: SpeedLog) {
      this.$walk((aegis: Core) => {
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
      this.$walk((aegis: Core) => {
        aegis.normalLogPipeline(log);
      });
    },
    destroy() {
      this.option.publishSpeed = function () { };
      this.option.publishNormalLog = function () { };
      this.option.hackFetchOptions && unHackFetch(this.option.hackFetchOptions);
    },
  });
}

export default plugin;
