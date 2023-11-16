import Core, {
  Plugin,
  SpeedLog,
  NormalLog,
  LogType,
  Config,
  formatUrl,
  urlIsHttps,
  tryToGetRetCode,
  formatApiDetail,
  isIgnoreUrl,
} from 'aegis-core';
import { hackCloud, OptReqs } from '../util/hack-cloud';
import { hackNetWork } from '../util/hack-network';
import { formatHeader } from '../util/hack-request';

const CALL_FUNCTION_TXT = 'callFunction';
const CALL_CONTAINER_TXT = 'callContainer';

export default new Plugin({
  name: 'reportApiSpeed',
  override: false,
  onNewAegis(aegis: Core) {
    if (!this.override) {
      this.override = true;
      // 改写fetch、xhr获取cgi日志，同一个应用只需要重写一次
      this.hackRequest(aegis.config);
      this.overrideCallFunction(aegis.config);
      this.overrideCallContainer(aegis.config);
    }
  },
  // 改写fetch
  hackRequest(config: Config) {
    hackNetWork({
      apiName: 'request',
      success: (
        res,
        opts,
      ) => {
        // 自身接口信息不上报
        if (isIgnoreUrl(opts.url, config.hostUrl)) return;
        const speedLog: SpeedLog = {
          method: opts.method || 'get',
          url: formatUrl(opts.url),
          duration: Date.now() - opts.aegisRequestStartTime,
          status: res.statusCode || 0,
          nextHopProtocol: '',
          isHttps: urlIsHttps(opts.url),
          type: 'fetch',
        };

        const apiDetail = config.api?.apiDetail;
        const { code, isErr } = tryToGetRetCode(res.data, config.api, {
          url: opts.url,
          ctx: res,
          payload: opts.data,
        }) || {};
        // 获取上报 request param
        const paramsTxt = apiDetail ? formatApiDetail(opts.data, config.api?.reqParamHandler, { url: opts.url }) : '';

        // 获取上报 response body
        const bodyTxt = apiDetail ? formatApiDetail(res.data, config.api?.resBodyHandler, { url: opts.url }) : '';

        // 获取上报 request headers
        const reqHeaders = config.api?.reqHeaders || [];
        const reportRequestHeadersTxt = formatHeader(opts?.header, reqHeaders, 'req');

        // 获取上报 response headers
        const resHeaders = config.api?.resHeaders || [];
        const reportResponseHeadersTxt = formatHeader(res?.header, resHeaders, 'res');

        const apiDesc = `req url: ${speedLog.url} 
                        \nres status: ${res.statusCode || 0} 
                        \nres duration: ${speedLog.duration}ms 
                        \nreq method: ${speedLog.method} 
                        \nreq param: ${paramsTxt}  
                        \nres retcode: ${code} 
                        \nres data: ${bodyTxt}
                        ${reportRequestHeadersTxt}
                        ${reportResponseHeadersTxt}`;
        // 白名单上报接口返回数据
        this.publishNormalLog({
          msg: apiDesc,
          level: LogType.API_RESPONSE,
          ctx: res,
        });

        speedLog.ret = code;
        speedLog.isErr = +isErr;
        speedLog.payload = opts.data;
        this.publishSpeedLog(speedLog);

        // 上报retcode错误日志
        isErr
          && this.publishNormalLog({
            msg: apiDesc,
            level: LogType.RET_ERROR,
            ctx: res,
          });
      },
      fail: (
        err,
        opts,
      ) => {
        if (isIgnoreUrl(opts.url, config.hostUrl)) return;
        const speedLog: SpeedLog = {
          method: opts.method || 'get',
          url: formatUrl(opts.url),
          duration: Date.now() - opts.aegisRequestStartTime,
          status: 0,
          nextHopProtocol: '',
          isHttps: urlIsHttps(opts.url),
          type: 'fetch',
        };
        this.publishSpeedLog(speedLog);
      },
    });
  },
  // 改写cloud.callFunction
  overrideCallFunction(config: Config) {
    hackCloud({
      apiName: CALL_FUNCTION_TXT,
      success: (
        res,
        opts,
      ) => {
        this.cloudSuccessCallback(config, opts, res, CALL_FUNCTION_TXT);
      },
      fail: (
        err,
        opts
      ) => {
        const speedLog: SpeedLog = {
          method: 'call',
          url: `wx.cloud.${CALL_FUNCTION_TXT}.${opts.name}`,
          duration: Date.now() - opts.aegisRequestStartTime,
          status: 0,
          nextHopProtocol: '',
          type: 'fetch',
          errMsg: err.errMsg,
          isHttps: true,
        };
        this.publishSpeedLog(speedLog);
      },
    });
  },
  // 改写callContainer
  overrideCallContainer(config: Config) {
    hackCloud({
      apiName: CALL_CONTAINER_TXT,
      success: (
        res,
        opts,
      ) => {
        this.cloudSuccessCallback(config, opts, res, CALL_CONTAINER_TXT);
      },
      fail: (
        err,
        opts
      ) => {
        const speedLog: SpeedLog = {
          method: 'call',
          url: `wx.cloud.${CALL_CONTAINER_TXT}.${opts.path}`,
          duration: Date.now() - opts.aegisRequestStartTime,
          status: 0,
          nextHopProtocol: '',
          type: 'fetch',
          errMsg: err.errMsg,
          isHttps: true,
        };
        this.publishSpeedLog(speedLog);
      },
    });
  },
  cloudSuccessCallback(
    config: Config, opts: OptReqs,
    res: ICloud.CallFunctionResult & ICloud.CallContainerResult, cloudType: string
  ) {
    const url = cloudType === CALL_FUNCTION_TXT ? opts.name : opts.path;
    const result = cloudType === CALL_FUNCTION_TXT ? res.result : res.data;
    const speedLog: SpeedLog = {
      method: 'call',
      url: `wx.cloud.${cloudType}.${url}`,
      duration: Date.now() - opts.aegisRequestStartTime,
      status: 200,
      nextHopProtocol: '',
      type: 'fetch',
      isHttps: true,
    };

    const deleteAtt = ['apiName', 'aegisRequestStartTime', 'config', 'success', 'fail', 'complete'];
    const params = Object.keys(opts).reduce((res: AnyObject, cur: keyof OptReqs): AnyObject => {
      if (!deleteAtt.includes(cur)) {
        res[cur] = opts[cur];
      }
      return res;
    }, {});
    const status = cloudType === CALL_FUNCTION_TXT ? res.data?.code || 0 : res.statusCode;
    const { code, isErr = false } = tryToGetRetCode(result, config.api, {
      url: speedLog.url,
      ctx: res,
      payload: params,
    }) || {};
    speedLog.ret = code;
    speedLog.isErr = +isErr;
    speedLog.payload = params;
    const apiDetail = config.api?.apiDetail;
    // 获取上报 request param
    const paramsTxt = apiDetail ? formatApiDetail(params, config.api?.reqParamHandler, { url: speedLog.url }) : '';

    // 获取上报 response body
    const bodyTxt = apiDetail ? formatApiDetail(result, config.api?.resBodyHandler, { url: speedLog.url }) : '';

    // 获取上报 request headers
    const reqHeaders = config.api?.reqHeaders || [];
    const reportRequestHeadersTxt = formatHeader(opts?.header, reqHeaders, 'req');

    // 获取上报 response headers
    const resHeaders = config.api?.resHeaders || [];
    const reportResponseHeadersTxt = formatHeader(res?.header, resHeaders, 'res');

    const apiDesc = `req url: ${speedLog.url}
                    \nres status: ${status}
                    \nres duration: ${speedLog.duration}ms 
                    \nreq type: ${speedLog.type}
                    \nreq params: ${paramsTxt}
                    \nres retcode: ${speedLog.ret}
                    \nres data: ${bodyTxt}
                    ${reportRequestHeadersTxt}
                    ${reportResponseHeadersTxt}`;
    // 白名单上报接口返回数据
    this.publishNormalLog({
      msg: apiDesc,
      level: LogType.API_RESPONSE,
      ctx: res,
    });
    this.publishSpeedLog(speedLog);
    // 上报retcode错误日志
    isErr
      && this.publishNormalLog({
        msg: apiDesc,
        level: LogType.RET_ERROR,
        ctx: res,
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
