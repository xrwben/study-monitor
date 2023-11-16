/* eslint-disable no-underscore-dangle */
/**
 * @插件 该插件会监听web页面的错误，并发布至每一个 Aegis 实例
 */
import Core, {
  Plugin,
  LogType,
  NormalLog,
  stringifyPlus,
  formatApiDetail,
  isIgnoreUrl,
} from 'aegis-core';
import { hackXHR, unHackXHR, HackXHROptions } from '../util/hack-http';
import { isNative, getSceneName } from '../util/util';

let plugin = new Plugin({ name: 'onError' });

// 获取 xhr response data 信息，暂时只兼容返回数据
const readBody = (xhr: XMLHttpRequest): string => {
  if (!xhr.responseType || xhr.responseType === 'text') {
    return xhr.responseText;
  }
  // else if (xhr.responseType === 'document') {
  //   data = xhr.responseXML;
  // } else {
  //   data = xhr.response;
  // }
  return '';
};


if (ON_ERROR) {
  plugin = new Plugin({
    // 插件名
    name: 'onError',
    // 上次上报的内容
    lastReportContent: '',
    // 插件加载后回调
    onNewAegis(aegis: Core) {
      this.startListen(aegis);
    },
    // 监听错误
    startListen(aegis: Core) {
      // 监听js错误
      isNative() ? this.handleNativeError() : this.handleWebError();

      // 监听xhr请求错误
      this.handleXhrError(aegis);

      // 监听未被处理的handle
      this.handleUnhandleRejectHandle();

      aegis.lifeCycle.on('destroy', () => {
        if (!window.document) {
          return;
        }
        if (plugin.countInstance() === 0) {
          window.document.removeEventListener('unhandledrejection', this.handleUnhandleRejectHandle.bind(this));
          window.document.removeEventListener('error', this.handleWebError.bind(this), true);
        }
      });
    },
    // 处理内嵌native error
    handleNativeError() {
      window.__errorHandler = (file: string, line: number, msg: string, error: Error) => {
        const sceneName = getSceneName();
        const report = `cocos 捕获全局 JS 错误：
              文件名：${file}，
              行数：${line}，
              错误提示：${msg}，
              场景堆栈：${sceneName},
              错误堆栈：${error}`;

        this.reportError(report);
      };
    },
    // 处理web类的error
    handleWebError() {
      // web
      window.addEventListener('error', (errorEvent) => {
        const sceneName = getSceneName();
        const { message, filename, lineno, colno } = errorEvent;
        const report = `cocos 捕获全局 JS 错误：
          文件名：${filename}，
          行数：${lineno}，
          列数：${colno}，
          错误提示：${message}，
          场景堆栈：${sceneName},
          错误堆栈：${this.processStackMsg(errorEvent.error)}`;

        this.reportError(report);
      });
    },
    // 上报错误
    reportError(content: string) {
      if (this.lastReportContent && this.lastReportContent === content) {
        // 相同report，不上报
        return;
      }

      // 上报
      this.publishErrorLog({
        msg: content,
        level: LogType.ERROR,
      });
      // 记录
      this.lastReportContent = content;
    },
    // 监听xhr请求错误
    handleXhrError(aegis: Core) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;

      const hackXHROptions: HackXHROptions = {
        name: this.name,
        send(xhr, body) {
          xhr.addEventListener('loadend', function aegisXhrLoadendHandler() {
            let type = '';
            if ((this as any).aegisTimeout) {
              type = 'timeout';
            } else if (!this.status) { // status 为 0 或者 undefined
              type = 'failed';
            } else if (this.status >= 400) {
              type = 'error';
            }

            // 自身接口报错不上报
            if (this.aegisUrl && isIgnoreUrl(this.aegisUrl, aegis.config.hostUrl)) return;

            if (!type) {
              return;
            }
            const apiDetail = aegis.config.api?.apiDetail;
            // 获取上报 request param
            const paramsTxt = apiDetail ? formatApiDetail(body, aegis.config.api?.reqParamHandler, { url: this.aegisUrl }) : '';
            // 获取上报 response body
            const bodyTxt = apiDetail ? formatApiDetail(readBody(xhr), aegis.config.api?.resBodyHandler, { url: this.aegisUrl }) : '';

            self.publishErrorLog({
              msg: `AJAX_ERROR: request ${type}
                       \nreq url: ${this.aegisUrl}
                       \nres status: ${this.status || 0}
                       \nres duration: ${Date.now() - xhr.aegisXhrStartTime}ms
                       \nreq method: ${this.aegisMethod}
                       \nreq param: ${paramsTxt}
                       \nres data: ${bodyTxt}`,
              level: LogType.AJAX_ERROR,
            });
          });

          xhr.addEventListener('timeout', () => {
            (xhr as any).aegisTimeout = true;
          });
        },
      };
      this.hackXHROptions = hackXHROptions;
      hackXHR(this.hackXHROptions);
    },
    // 监听未被处理的handle
    handleUnhandleRejectHandle() {
      const unhandledrejectionHandler = (event: PromiseRejectionEvent) => {
        const reason = event && stringifyPlus(event.reason);
        // 给每一个实例发送 Promise 未被 catch 错误日志
        this.publishErrorLog({
          msg: `PROMISE_ERROR: ${reason}`,
          level: LogType.PROMISE_ERROR,
        });
      };
      // 监听未被catch的promise错误
      window.addEventListener('unhandledrejection', unhandledrejectionHandler);
    },
    // 分发错误日志
    publishErrorLog(msg: NormalLog | NormalLog[]) {
      this.$walk((aegis: Core) => {
        const { config: { onError = true } } = aegis;
        onError && aegis.normalLogPipeline(msg);
      });
    },
    destroy() {
      // 直接删除error listener可能会出问题，所以把publishErrorLog变成空函数
      this.option.publishErrorLog = function () { };
      this.option.hackXHROptions && unHackXHR(this.option.hackXHROptions);
    },
    // 处理error stack信息
    processStackMsg(error: Error) {
      if (error.stack === undefined) {
        return error;
      }

      let stack = error.stack
        .replace(/\n/gi, '') // 去掉换行，节省传输内容大小
        .replace(/\bat\b/gi, '@') // chrome中是at，ff中是@
        .split('@') // 以@分割信息
        .slice(0, 10) // 最大堆栈长度（Error.stackTraceLimit = 10），所以只取前10条
        .map((v: string) => v.replace(/^\s*|\s*$/g, '')) // 去除多余空格
        .join('~') // 手动添加分隔符，便于后期展示
        .replace(/\?[^:]+/gi, ''); // 去除js文件链接的多余参数(?x=1之类)
      const msg = error.toString();
      if (stack.indexOf(msg) < 0) {
        stack = `${msg}~${stack}`;
      }
      return `STACK:${stack}`;
    },
  });
}

export default plugin;
