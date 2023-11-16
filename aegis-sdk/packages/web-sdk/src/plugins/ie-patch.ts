/**
 * @插件 ie错误监听插件，该插件会监听web页面的错误，并发布至每一个 Aegis 实例
 */
import Core, {
  Plugin,
  LogType,
  NormalLog,
  SendOption,
  SendSuccess,
  SendFail,
  stringifyPlus,
} from 'aegis-core';
import { isIgnoreErrorMsg } from '../util';
import Aegis from '../aegis';

let plugin = new Plugin({ name: 'ie' });

if (IS_IE) {
  plugin = new Plugin({
    name: 'ie',
    init() {
      this.overrideAegisSend();
    },
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
            msg: `${errMsg || ''} @ (${args[1] || ''}:${args[2] || 0}:${args[3] || 0})
          \n${stringifyPlus(args[4] || '')}`,
            level: LogType.ERROR,
          }, aegis);
        }

        orgError?.call(window, ...args);
      };
    },
    overrideAegisSend() {
      // 改写Aegis的send方法，因为ie不支持cors，所以不能用xhr发请求
      Aegis.prototype.request = function (
        options: SendOption,
        success?: SendSuccess,
        fail?: SendFail,
      ) {
        if (!options || typeof options.url !== 'string' || options.url === '' || !this.bean.id) {
          // 参数错误或者没有项目ID，不让发请求
          return;
        }

        let { url } = options;
        if (options.addBean !== false) {
          url = `${url}${url.indexOf('?') === -1 ? '?' : '&'}${this.getBean(options.beanFilter)}`;
        }
        const sender = new Image();

        sender.onload = () => {
          this.request(options, success, fail);
          success?.(null);
        };

        sender.onerror = () => {
          this.request(options, success, fail);
          fail?.(null);
        };

        if (options.data) {
          sender.src = `${url}&${options.data}`;
        } else {
          sender.src = url;
        }
      };
    },
    // 分发错误日志
    publishErrorLog(msg: NormalLog | NormalLog[], instance: Core) {
      this.$walk((aegis: Core) => {
        if (aegis !== instance) return;
        aegis.normalLogPipeline(msg);
      });
    },
    destroy() {
      // 直接删除error listener可能会出问题，所以把publishErrorLog变成空函数
      this.option.publishErrorLog = function () { };
    },
  });
}

export default plugin;
