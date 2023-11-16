/**
 * @插件 该插件会监听web页面的错误，并发布至每一个 Aegis 实例
 */
import Core, { Plugin, LogType, NormalLog, stringifyPlus, isIgnoreUrl } from 'aegis-core';
import hackWebSocket, { HackWsConfig, unHackWs, WsError } from '../util/hack-websocket';
import { isIgnoreErrorMsg } from '../util';

let plugin = new Plugin({ name: 'onError' });

if (ON_ERROR) {
  plugin = new Plugin({
    name: 'onError',
    onNewAegis(aegis: Core) {
      this.startListen(aegis);
    },
    // 监听错误
    startListen(aegis: Core) {
      // 监听js执行错误
      const orgError = window.onerror;
      window.onerror = (...args) => {
        const errMsg = stringifyPlus(args[0]);
        if (!isIgnoreErrorMsg(errMsg)) {
          // 给每一个实例发送js错误
          this.publishErrorLog({
            msg: `${errMsg || ''} @ (${stringifyPlus(args[1]) || ''}:${args[2] || 0
            }:${args[3] || 0})
          \n${stringifyPlus(args[4] || '')}`,
            level: LogType.ERROR,
          }, aegis);
        }

        orgError?.call(window, ...args);
      };

      const unhandledrejectionHandler = (event: PromiseRejectionEvent) => {
        const reason = event && stringifyPlus(event.reason);
        // 给每一个实例发送 Promise 未被 catch 错误日志
        reason && this.publishErrorLog({
          msg: `PROMISE_ERROR: ${reason}`,
          level: LogType.PROMISE_ERROR,
        }, aegis);
      };
      // 监听未被catch的promise错误
      window.addEventListener('unhandledrejection', unhandledrejectionHandler);

      const isBlockedUrl = (url: string): boolean => {
        if (isIgnoreUrl(url, aegis.config.hostUrl)) {
          return true;
        }
        // 当src属性为空时，会触发资源加载异常，并且url为不包含hash的location.href。
        if (window.location.href.indexOf(url) > -1) {
          return true;
        }
        return false;
      };

      const errorHandler = (event: Event) => {
        const target = event?.target || event?.srcElement;
        if (!target) {
          return;
        }
        const url = target.src || target.href || '';

        const { tagName = 'script' } = target;

        // 将错误上报到错误日志
        if (!isBlockedUrl(url)) {
          const log: NormalLog = {
            msg: `${tagName} load fail: ${url}`,
            level: LogType.INFO,
          };
          // 先根据文件后缀简单判断
          if (/\.js$/.test(url)) {
            log.level = LogType.SCRIPT_ERROR;
          } else if (/\.css$/.test(url)) {
            log.level = LogType.CSS_ERROR;
          } else {
            // 再根据文件类型判断
            switch (tagName.toLowerCase()) {
              case 'script':
                log.level = LogType.SCRIPT_ERROR;
                break;
              case 'link':
                log.level = LogType.CSS_ERROR;
                break;
              case 'img':
                log.level = LogType.IMAGE_ERROR;
                break;
              case 'audio':
              case 'video':
                log.level = LogType.MEDIA_ERROR;
                break;
              default:
                return;
            }
          }
          this.publishErrorLog(log, aegis);
        }
      };
      // 监听静态资源加载错误
      window.document.addEventListener('error', errorHandler, true);

      aegis.lifeCycle.on('destroy', () => {
        if (plugin.countInstance() === 0) {
          window.document.removeEventListener('unhandledrejection', unhandledrejectionHandler);
          window.document.removeEventListener('error', errorHandler, true);
        }
      });
      // 监听websocket相关错误
      if (aegis.config.websocketHack) {
        const hackWebsocketConfig: HackWsConfig = {
          key: `${aegis.config.id}-${this.name}`, // 同一个aegis instance的同一个插件，只需要添加一次
          onErr: (e) => {
            this.publishWsErrorLog?.(e, aegis);
          },
          sendErr: (e) => {
            this.publishWsErrorLog?.(e, aegis);
          },
        };
        this.hackWebsocketConfig = hackWebsocketConfig;
        hackWebSocket(this.hackWebsocketConfig);
      }
    },
    // 分发错误日志
    publishErrorLog(msg: NormalLog | NormalLog[], instance: Core) {
      this.$walk((aegis: Core) => {
        if (aegis !== instance) return;
        aegis.normalLogPipeline(msg);
      });
    },
    publishWsErrorLog(e: WsError, aegis: Core) {
      const { connectUrl, msg, readyState } = e;
      this.publishErrorLog({
        msg: `WEBSOCKET_ERROR: 
              connect: ${connectUrl}
              readyState: ${readyState}
              msg: ${msg}`,
        level: LogType.WEBSOCKET_ERROR,
      }, aegis);
    },
    destroy() {
      // 直接删除error listener可能会出问题，所以把publishErrorLog变成空函数
      this.option.publishErrorLog = function () { };
      this.option.hackWebsocketConfig && unHackWs(this.option.hackWebsocketConfig);
    },
  });
}

export default plugin;
