/**
 * @插件 该插件会监听页面的错误，并发布至每一个 Aegis 实例
 */
import Core, { Config, LogType, NormalLog, Plugin } from 'aegis-core';

export default new Plugin({
  name: 'onError',
  listening: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(config: Config) {
    this.startListen();
  },
  startListen() {
    if (this.listening) return;
    this.listening = true;
    try {
      // if (typeof refVue === 'undefined' || !refVue) return;
      // 获取全局已经注册的全局错误监听函数
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      lite.addEventListener('error', (err: Error, origin: any) => {
        if (!err) {
          return;
        }
        this.publishErrorLog({
          msg: err,
          level: LogType.ERROR,
        });
      });
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

