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
  tryToGetRetCode,
  formatApiDetail,
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
    const httpModule = viola.proxyModule.http;

    Object.keys(httpModule).reduce((module: Record<string, Function>, key) => {
      module[key] = (...args: any[]) => {
        let url = '';
        let option: Record<string, any> = {};
        let data: Record<string, any> = {};
        let cb: Function;
        if (typeof args[0] === 'string') {
          [url, data, cb] = args;
          option.method = key === 'requestPost' ? 'POST' : 'GET';
          option.url = url;
          option.data = data;
        } else {
          [option, cb] = args;
          ({ url } = option);
        }
        const self = this;
        const sendTime = Date.now();
        return httpModule[key](option, (res: any) => {
          if (typeof res === 'string') {
            res = JSON.parse(res);
          }
          // 非 cgi 请求不进行上报
          if (url.indexOf('https://aegis.qq.com') > -1) {
            cb?.(res);
            return;
          }
          const { data } = res;
          const { code, isErr } = tryToGetRetCode(data, config.api, { url, ctx: res, payload: option.body });

          // 上报测速日志
          const log: SpeedLog = {
            url: formatUrl(url),
            isHttps: urlIsHttps(url),
            method: option?.method || 'get',
            duration: Date.now() - sendTime,
            type: 'fetch',
            nextHopProtocol: '',
            ret: code || 'unknown',
            isErr: +isErr,
            status: res.code,
            payload: option.body,
          };
          self.publishSpeed(log);

          // 上报接口返回数据
          self.publishNormalLog({
            msg: `${url} ${data}`,
            level: LogType.API_RESPONSE,
          });

          if (res.success) {
            // 上报 retcode 非 0 的情况
            if (isErr) {
              self.publishNormalLog({
                msg: `request url: ${url} \n response: ${data}`,
                level: LogType.RET_ERROR,
              });
            }
          } else {
            // 非 200 的情况
            const duration = Date.now() - sendTime;
            const log: SpeedLog = {
              url: formatUrl(url),
              isHttps: urlIsHttps(url),
              method: option?.method || 'get',
              duration,
              nextHopProtocol: '',
              type: 'fetch',
              status: 0,
            };
            self.publishSpeed(log);

            // 获取上报 request param
            const paramsTxt = config.api?.apiDetail ? formatApiDetail(option?.body, config.api?.reqParamHandler, { url }) : '';

            const apiDesc = `AJAX_ERROR: ${res}
                            \nreq url: ${url}
                            \nres status: 0
                            \nres duration: ${duration}ms
                            \nreq method: ${option?.method || 'get'}
                            \nres retcode: ${code}
                            \nreq param: ${paramsTxt}`;
            // 上报接口错误数据
            self.publishNormalLog({
              msg: apiDesc,
              level: LogType.AJAX_ERROR,
            });
          }
          // 原封不动返回res
          cb?.(res);
        });
      };
      return module;
    }, (viola.proxyModule.http = {}));
  },
});
