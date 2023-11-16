/**
 * @插件 该插件会监听页面的错误，并发布至每一个 Aegis 实例
 */
import Core, { LogType, NormalLog, Plugin } from 'aegis-core';

export default new Plugin({
  name: 'onError',
  listening: false,
  init() {
    this.startListen();
  },
  startListen() {
    if (this.listening) return;
    this.listening = true;
    try {
      // @ts-ignore
      // eslint-disable-next-line no-undef
      const refVue = Vue;
      if (typeof refVue === 'undefined' || !refVue) return;
      // 获取全局已经注册的全局错误监听函数
      const originUncaughtException = refVue.config.errorHandler as any;
      refVue.config.errorHandler = (error: Error) => {
        // 给每一个实例发送js错误
        if (error) {
          this.publishErrorLog({
            msg: error,
            level: LogType.ERROR,
          });
        }
        // 触发原来的错误监听函数
        if (typeof originUncaughtException === 'function') {
          originUncaughtException(error);
        }
      };
    } catch (ex) {
      this.publishErrorLog({
        msg: ex,
        level: LogType.ERROR,
      });
    }
  },
  // 由于Aegis可能存在多个实例，但页面的错误只需要监听一次，
  // 所以该插件只负责收集每一个实例的 send 方法，
  // 后续监听到错误时再分发到所有的实例中。
  publishErrorLog(msg: NormalLog | NormalLog[]) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(msg);
    });
  },
});
