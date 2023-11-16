import Core, { Plugin, LogType, NormalLog, tryToGetRetCode, Config, formatApiDetail, isIgnoreUrl } from 'aegis-core';
import { env } from '../adaptor';
import { wxCanIUse } from '../util/wxApi';
import { hackNetWork } from '../util/hack-network';
import { hackCloud } from '../util/hack-cloud';
import { compareVersion } from '../util/index';
import { toHackWsConnect } from '../util/hack-wsConnect';
import { HackApiCallback } from '../util/hack-api';
import { formatHeader } from '../util/hack-request';
import { isWxRequestTimeoutError } from '../util/resolve-wx-request-error';

export default new Plugin({
  name: 'onError',
  onNewAegis(aegis: Core) {
    const version = env.getSystemInfoSync().SDKVersion;
    this.listenError();
    this.hackNetWork(aegis);
    this.hackCloud(aegis);
    // 对于过低版本进行兼容,或者不打开websocket监控,不进行hack
    if (aegis.config.websocketHack && compareVersion(version, '1.7.0')) {
      this.hackWsConnect();
    }
  },
  listenError() {
    /**
     * 监听js执行错误
     * 小程序插件不支持该方法，使用前需要判断可用性
     */
    if (typeof env.onError === 'function') {
      env.onError((error: string) => {
        if (error) {
          // 给每一个实例发送js错误
          this.publishErrorLog({
            msg: error,
            level: LogType.ERROR,
          });
        }
      });
    }

    // 监听 Promise 异常
    // 安卓平台暂时不会派发该事件
    if (wxCanIUse('onUnhandledRejection')) {
      env.onUnhandledRejection(({ reason }) => {
        if (reason) {
          // promise 错误过滤接口请求失败
          if (JSON.stringify(reason).indexOf('request:fail') > -1) return;

          this.publishErrorLog({
            msg: reason,
            level: LogType.PROMISE_ERROR,
          });
        }
      });
    }
    // 监听小程序要打开的页面不存在事件
    if (wxCanIUse('onPageNotFound')) {
      env.onPageNotFound((error: WechatMiniprogram.OnPageNotFoundListenerResult) => {
        if (error) {
          this.publishErrorLog({
            msg: error,
            level: LogType.PAGE_NOT_FOUND_ERROR,
          });
        }
      });
    }
    // 监听小程序异步组件加载失败
    if (wxCanIUse('onLazyLoadError')) {
      env.onLazyLoadError((error: WechatMiniprogram.OnLazyLoadErrorListenerResult) => {
        if (error) {
          this.publishErrorLog({
            msg: error,
            level: LogType.LAZY_LOAD_ERROR,
          });
        }
      });
    }
  },
  publishErrorLog(log: NormalLog | NormalLog[]) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(log);
    });
  },
  hackNetWork(aegis: Core) {
    const { config } = aegis;
    const hackAjax: HackApiCallback[] = [
      { apiName: 'request', complete: (res, opts) => this.requestCompleteError(res, opts, config) },
      { apiName: 'uploadFile', complete: (res, opts) => this.uploadFileCompleteError(res, opts, config)  },
      { apiName: 'downloadFile', complete: (res, opts) => this.downloadFileCompleteError(res, opts, config) },
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const { apiName, complete } of hackAjax) {
      hackNetWork({ apiName, complete });
    }
  },
  requestCompleteError(res:  WechatMiniprogram.RequestSuccessCallbackResult, opts: any, config: Config) {
    const { errMsg, statusCode } = res;

    if (isIgnoreUrl(opts.url, config.hostUrl)) return;

    const type = this.getErrorType({ errMsg, statusCode });
    if (type) {
      const logInfo = { apiName: 'request', opts, res, config, type };
      this.publishNetWorkError(logInfo);
    }
  },
  downloadFileCompleteError(res: WechatMiniprogram.DownloadFileSuccessCallbackResult, opts: any, config: Config) {
    const { errMsg, statusCode, filePath, tempFilePath } = res;
    const type = this.getErrorType({ errMsg, statusCode });
    if (type) {
      // 获取上报 request param
      const paramsTxt = config.api?.apiDetail ? formatApiDetail(opts.data, config.api?.reqParamHandler, { url: opts.url }) : '';

      this.publishErrorLog({
        msg: `AJAX_ERROR: downloadFile ${type}
                  \nreq url: ${opts.url}
                  \nres status: ${statusCode || 0}
                  \nres duration: ${Date.now() - opts.aegisRequestStartTime}ms
                  \nres filePath: ${filePath}
                  \nres tempFilePath: ${tempFilePath}
                  \nreq method: ${opts.method || 'get'}
                  \nreq param: ${paramsTxt}
                  \nerrMsg: ${errMsg.slice(0, 1000)}`,
        level: LogType.AJAX_ERROR,
      });
    }
  },
  uploadFileCompleteError(res: WechatMiniprogram.UploadFileSuccessCallbackResult, opts: any, config: Config) {
    const { errMsg, statusCode } = res;
    const type = this.getErrorType({ errMsg, statusCode });
    if (type) {
      const logInfo = { apiName: 'uploadFile', opts, res, config, type };
      this.publishNetWorkError(logInfo);
    }
  },
  hackCloud(aegis: Core) {
    const { config } = aegis;
    const hackAjax: HackApiCallback[] = [
      { apiName: 'callFunction', complete: (res, opts) => this.callFunctionCompleteError(res, opts, config) },
      { apiName: 'callContainer', complete: (res, opts) => this.callContainerCompleteError(res, opts, config)  },
    ];
    // eslint-disable-next-line no-restricted-syntax
    for (const { apiName, complete } of hackAjax) {
      hackCloud({ apiName, complete });
    }
  },
  callFunctionCompleteError(res: ICloud.CallFunctionResult, opts: any, config: Config) {
    if (res.errMsg.indexOf('fail') > -1 || res.errMsg.indexOf('timeout') > -1) {
      const apiDetail = config.api?.apiDetail;
      // 获取上报 request param
      const paramsTxt = apiDetail ? formatApiDetail(opts.data, config.api?.reqParamHandler, { url: opts?.url }) : '';
      // 获取上报 response body
      const bodyTxt = apiDetail ? formatApiDetail(res, config.api?.resBodyHandler, { url: opts?.url }) : '';

      this.publishErrorLog({
        msg: `AJAX_ERROR: cloud.callFunction:fail
                    \nreq url: cloud.callFunction.${opts.name}
                    \nres status: ${0}
                    \nres duration: ${Date.now() - opts.aegisRequestStartTime}ms
                    \nres data: ${bodyTxt}
                    \nreq method: POST
                    \nreq param: ${paramsTxt}
                    \nerrMsg: ${res.errMsg.slice(0, 1000)}`,
        level: LogType.AJAX_ERROR,
      });
    }
  },
  callContainerCompleteError(res: ICloud.CallContainerResult, opts: any, config: Config) {
    const { errMsg, statusCode } = res;
    if (statusCode >= 400 || errMsg.indexOf('fail') > -1 || errMsg.indexOf('timeout') > -1) {
      const apiDetail = config.api?.apiDetail;
      // 获取上报 request param
      const paramsTxt = apiDetail ? formatApiDetail(opts.data, config.api?.reqParamHandler, { url: opts?.url }) : '';
      // 获取上报 response body
      const bodyTxt = apiDetail ? formatApiDetail(res, config.api?.resBodyHandler, { url: opts?.url }) : '';

      // 获取上报 request headers
      const reqHeaders = config.api?.reqHeaders || [];
      const reportRequestHeadersTxt = formatHeader(opts?.header, reqHeaders, 'req');

      // 获取上报 response headers
      const resHeaders = config.api?.resHeaders || [];
      const reportResponseHeadersTxt = formatHeader(res?.header, resHeaders, 'res');

      this.publishErrorLog({
        msg: `AJAX_ERROR: cloud.callContainer:fail
                    \nreq url: ${opts.path}
                    \nres status: ${statusCode || 0}
                    \nres duration: ${Date.now() - opts.aegisRequestStartTime}ms
                    \nreq method: ${opts.method || 'POST'}
                    \nreq param: ${paramsTxt}
                    \nres data: ${bodyTxt}
                    \nerrMsg: ${errMsg.slice(0, 1000)}
                    ${reportRequestHeadersTxt}
                    ${reportResponseHeadersTxt}`,
        level: LogType.AJAX_ERROR,
      });
    }
  },
  publishNetWorkError(logInfo: any) {
    const { apiName, opts, res, config, type } = logInfo;
    const { errMsg, statusCode,  data } = res;
    const url = `wx.cloud.callFunction.${opts.url}`;
    const { code } = tryToGetRetCode(data, config.api, { url, ctx: res, payload: opts.data });
    const apiDetail = config.api?.apiDetail;
    // 获取上报 request param
    const paramsTxt = apiDetail ? formatApiDetail(opts.data, config.api?.reqParamHandler, { url }) : '';

    // 获取上报 response body
    const bodyTxt = apiDetail ? formatApiDetail(data, config.api?.resBodyHandler, { url }) : '';

    // 获取上报 request headers
    const reqHeaders = config.api?.reqHeaders || [];
    const reportRequestHeadersTxt = formatHeader(opts?.header, reqHeaders, 'req');

    // 获取上报 response headers
    const resHeaders = config.api?.resHeaders || [];
    const reportResponseHeadersTxt = formatHeader(res?.header, resHeaders, 'res');

    this.publishErrorLog({
      msg: `AJAX_ERROR: ${apiName} ${type}
                  \nreq url: ${opts.url}
                  \nres status: ${statusCode || 0}
                  \nres duration: ${Date.now() - opts.aegisRequestStartTime}ms
                  \nreq method: ${opts.method || 'get'}
                  \nreq param: ${paramsTxt}
                  \nres retcode: ${code}
                  \nres data: ${bodyTxt}
                  \nerrMsg: ${errMsg.slice(0, 1000)}
                  ${reportRequestHeadersTxt}
                  ${reportResponseHeadersTxt}`,
      level: LogType.AJAX_ERROR,
    });
  },
  // 获取错误类型
  getErrorType(msgStatus: {errMsg: string, statusCode: number }) {
    const { errMsg, statusCode } = msgStatus;
    let type = '';
    // 前端超时错误
    if (isWxRequestTimeoutError(errMsg)) {
      type = 'timeout';
    } else if (statusCode >= 400) {
      type = 'error';
    } else if (errMsg.indexOf('fail') > -1 || !statusCode || statusCode < 0) {
      type = 'failed';
    }
    return type;
  },
  hackWsConnect() {
    hackNetWork({
      apiName: 'sendSocketMessage',
      fail: (error) => {
        this.publishSocketError(error);
      },
    });
    toHackWsConnect({
      connectCallback: {
        fail: (error) => {
          this.publishSocketError(error);
        },
      },
      taskOpt: {
        onError: (error) => {
          this.publishSocketError(error);
        },
        send: {
          fail: (error) => {
            this.publishSocketError(error);
          },
        },
      },
    });
  },
  publishSocketError(error: any) {
    if (error) {
      this.publishErrorLog({
        msg: error.errMsg,
        level: LogType.WEBSOCKET_ERROR,
      });
    }
  },
});

