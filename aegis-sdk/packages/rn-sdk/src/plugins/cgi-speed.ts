/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
// 该插件收集各种cgi请求的日志
import Core, {
  Plugin,
  SpeedLog,
  NormalLog,
  LogType,
  StaticAssetsLog,
  Config,
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
    if (!this.override) {
      this.override = true;
      // 改写fetch、xhr获取cgi日志，同一个应用只需要重写一次
      this.overrideFetch(aegis.config);
      this.overrideXhr(aegis.config);
    }
  },
  // 重写fetch方法
  overrideFetch(config: Config) {
    if (typeof window.fetch !== 'function') return;
    if (window.fetch.name === 'aegisFakeFetch') return;
    const originFetch = window.fetch;
    const self = this;
    window.fetch = function aegisFakeFetch(url: string, option) {
      const sendTime = Date.now();

      return originFetch(url, option)
        .then((res) => {
          if (isIgnoreUrl(url, config.hostUrl)) return res;
          try {
            const contentType = (res.headers && res.headers.get('content-type')) || '';
            // 请求失败时content-type经常会是text/plain，所以当失败时一律认为是cgi请求
            if (!res.ok || !isRequestAsset(contentType, url)) {
              // cgi
              res
                .clone()
                .text()
                .then((data: string) => {
                  // 上报接口返回数据
                  self.publishNormalLog({
                    msg: `${url} ${data}`,
                    level: LogType.API_RESPONSE,
                  });
                  const { code, isErr } = tryToGetRetCode(data, config.api, {
                    url,
                    ctx: res,
                    payload: option?.body,
                  }) || {};
                  const log: SpeedLog = {
                    url: formatUrl(res.url),
                    isHttps: urlIsHttps(res.url),
                    method: option?.method || 'get',
                    duration: Date.now() - sendTime,
                    type: 'fetch',
                    nextHopProtocol: '',
                    ret: code || 'unknown',
                    isErr: +isErr,
                    status: res.status,
                    payload: option?.body,
                  };
                  // 上报测速日志
                  self.publishSpeed(log);
                  // 上报错误日志，去掉code,errorCode之类的配置
                  isErr && self.publishNormalLog({
                    msg: `request url: ${url} \n response: ${data}`,
                    level: LogType.RET_ERROR,
                  });
                });
            } else {
              // 静态资源
              const log: StaticAssetsLog = {
                url: formatUrl(res.url),
                isHttps: urlIsHttps(res.url),
                method: option?.method || 'get',
                duration: Date.now() - sendTime,
                type: 'static',
                status: res.status,
                nextHopProtocol: '',
                urlQuery: formatUrl(res.url, true),
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
          throw err;
        });
    };
  },
  // 重写XHR
  overrideXhr(config: Config) {
    const xhrProto = window.XMLHttpRequest.prototype;
    const originOpen = xhrProto.open;
    const originSend = xhrProto.send;
    const self = this;

    // 改写open
    if (originOpen.name !== 'aegisFakeXhrOpen') {
      xhrProto.open = function aegisFakeXhrOpen() {
        // 将method及url挂载到xhr实例上，因为当请求发送失败的时候拿不到url及method
        if (!this.aegisMethod || !this.aegisUrl) {
          // 发送method
          this.aegisMethod = arguments[0];
          // 请求url
          this.aegisUrl = arguments[1];
          // 请求开始的时间
          this.aegisXhrStartTime = Date.now();
        }

        return originOpen.apply(this, arguments);
      };
    }

    // 改写send
    if (originSend.name !== 'aegisFakeXhrSend') {
      xhrProto.send = function aegisFakeXhrSend() {
        const sendTime = Date.now();
        const that = this;
        let duration = 0;
        // aegis 发的请求不做修改
        !that.sendByAegis
          && that.addEventListener('loadend', () => {
            const url = that.aegisUrl;
            if (!url || isIgnoreUrl(url, config.hostUrl)) return;

            duration = Date.now() - sendTime;
            const speedLog: SpeedLog = {
              url: formatUrl(url),
              isHttps: urlIsHttps(url),
              status: that.status || 0,
              method: that.aegisMethod || 'get',
              type: 'fetch',
              duration,
              nextHopProtocol: '',
              // payload: new PayloadXHR(that),
            };

            // 根据content-type判断请求资源是静态资源还是cgi
            // 请求失败时content-type经常会是text/plain，所以当失败时一律认为是cgi请求
            const contentType = that.getResponseHeader('content-type') || '';
            if (
              that.status >= 400 || !isRequestAsset(contentType, speedLog.url)
            ) {
              try { // cgi
                self.publishNormalLog({
                  msg: `req url: ${url}
                        \nres status: ${that.status}
                        \nres duration: ${duration}ms
                        \nres method: ${speedLog.method}
                        \nres data: ${JSON.stringify(that.response)}`,
                  level: LogType.API_RESPONSE,
                });

                const { code, isErr } = tryToGetRetCode(that.response, config.api, { url, ctx: that }) || {};
                speedLog.ret = code;
                speedLog.isErr = +isErr;

                // 上报测速日志
                isErr && self.publishNormalLog({
                  msg: `request url: ${url} \n response: ${that.response}`,
                  level: LogType.RET_ERROR,
                });
              } catch (e) {
                speedLog.ret = 'unknown';
              }
            } else { // 静态资源
              delete speedLog.ret;
              Object.assign(speedLog, {
                urlQuery: formatUrl(url, true),
                type: 'static',
                domainLookup: ReportDefaultVal.number as number,
                connectTime: ReportDefaultVal.number as number,
              });
            }

            self.publishSpeed(speedLog);
          });

        // eslint-disable-next-line prefer-rest-params
        return originSend.apply(this, arguments);
      };
    }
  },
  // getRetCodeHandler(config: Config) {
  //   return config.api
  //   && typeof config.api.retCodeHandler === 'function'
  //   && config.api.retCodeHandler; // 提供一个钩子函数
  // },
  // 分发测速日志
  publishSpeed(log: SpeedLog) {
    this.$walk((aegis: Core) => {
      aegis.speedLogPipeline(log);
    });
  },
  // 分发api返回值
  publishNormalLog(log: NormalLog) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(log);
    });
  },
});

