/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * @插件 该插件会监听页面的错误，并发布至每一个 Aegis 实例
 */
import Core, { Plugin, LogType, NormalLog, globalAny } from 'aegis-core';

interface RetcodeErrorMap {
  actionType?: string;
  'Call REPORT'?: object;
  data?: any;
  error: {
    networkError: boolean;
    retcode: number;
  };
  type: string;
}
// 由于Aegis可能存在多个实例，但页面的错误只需要监听一次，
// 所以该插件只负责收集每一个实例的 send 方法，
// 后续监听到错误时再分发到所有的实例中。
export default new Plugin({
  name: 'onError',
  listening: false,
  init() {
    // 开始监听错误（只监听一次）
    this.startListen();
  },
  startListen() {
    if (this.listening) return;
    this.listening = true;
    // 重写setGlobalHandler，避免被业务监听覆盖---start
    const errorUtils = globalAny.ErrorUtils as any;

    const originSetGlobalHandler = errorUtils.setGlobalHandler;

    errorUtils.setGlobalHandler = (fn: Function, tag: string) => {
      if (tag === 'willCallOriginHandler') {
        // 不会覆盖以前的监听函数
        originSetGlobalHandler.call(errorUtils, fn);
      } else {
        // 调用可能直接覆盖了监听函数，所以需要在这里避免覆盖
        const originGlobalErrorHandle = errorUtils.getGlobalHandler as any;
        originSetGlobalHandler((...args: any) => {
          // 调用之前的监听函数
          originGlobalErrorHandle.call(errorUtils, ...args);
          fn.call(errorUtils, ...args);
        });
      }
    };
    // 重写---end
    // 获取全局已经注册的全局错误监听函数
    const originGlobalErrorHandle = errorUtils.getGlobalHandler();

    errorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
      if (error) {
        // 给每一个实例发送js错误及堆栈
        this.publishErrorLog({
          msg: `${error}\n${error.stack}`,
          level: LogType.ERROR,
        });
      }

      // 触发原来的错误监听函数
      if (typeof originGlobalErrorHandle === 'function') {
        originGlobalErrorHandle.call(errorUtils, error, isFatal);
      }
    }, 'willCallOriginHandler');

    // 未被catch的promise错误
    require('promise/setimmediate/rejection-tracking').enable({
      allRejections: true,
      onUnhandled: (id: number, data: object | string | RetcodeErrorMap, stack: string) => {
        let level: string = LogType.PROMISE_ERROR;

        const errString: string = typeof data === 'object' ? JSON.stringify(data) : data;
        // retcode异常
        if (typeof data === 'object' && 'error' in data && 'retcode' in data.error) {
          if (!data.error.networkError) {
            level = LogType.RET_ERROR;
          } else {
            return;
          }
        }
        this.publishErrorLog({
          msg: `PROMISE_ERROR: ${errString}\n${stack}`,
          level,
        });
      },
    });

    // 监听ajax错误
    const xhrProto = window.XMLHttpRequest.prototype;
    const originOpen = xhrProto.open;
    const originSend = xhrProto.send;
    const self = this;
    const resetOpen = function () {
      if (originOpen.name === 'aegisFakeXhrOpen') return;
      xhrProto.open = function aegisFakeXhrOpen() {
        // 绑定请求method和url
        if (!this.aegisMethod || !this.aegisUrl) {
          this.aegisMethod = arguments[0];
          this.aegisUrl = arguments[1];
          this.aegisXhrStartTime = Date.now();
        }

        return originOpen.apply(this, arguments);
      };
    };
    resetOpen();

    const resetSend = function () {
      if (originSend.name === 'aegisFakeXhrSend') return;
      xhrProto.send = function aegisFakeXhrSend() {
        // aegis 发的请求
        const that = this;
        !that.sendByAegis
          && that.addEventListener('loadend', () => {
            let type = '';
            if (that.failType) {
              type = that.failType;
            } else if (!that.status) {
              type = 'failed';
            } else if (that.status >= 400) {
              type = 'error';
            }

            if (!type) {
              return;
            }

            self.publishErrorLog({
              msg: `AJAX_ERROR: request ${type}
                    \nreq url: ${(that as any).aegisUrl}
                    \nres status: ${that.status || 0}
                    \nres duration: ${Date.now() - (that as any).aegisXhrStartTime}ms
                    \nreq method: ${(that as any).aegisMethod}`,
              level: LogType.AJAX_ERROR,
            });
          });
        // aegis 发的请求
        !this.sendByAegis
          && this.addEventListener('timeout', function aegisXhrLoadendHandler() {
            // @ts-ignore 超时标记
            this.failType = 'timeout';
          });
        return originSend.apply(this, arguments);
      };
    };
    resetSend();
  },
  publishErrorLog(msg: NormalLog | NormalLog[]) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(msg);
    });
  },
});
