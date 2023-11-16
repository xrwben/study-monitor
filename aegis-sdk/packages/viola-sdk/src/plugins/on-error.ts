/**
 * @插件 该插件会监听页面的错误，并发布至每一个 Aegis 实例
 */
import Core, { Plugin, LogType, NormalLog } from 'aegis-core';

export default new Plugin({
  name: 'onError',
  init() {
    // 开始监听错误
    this.startListen();
  },
  // 分发错误日志
  publishErrorLog(msg: NormalLog | NormalLog[]) {
    this.$walk((aegis: Core) => {
      // eslint-disable-next-line no-underscore-dangle
      aegis.normalLogPipeline(msg);
    });
  },
  /**
   * @description 监听viola全局错误，进行上报，viola目前支持 uncaughtException 错误监听
   * @todo viola.on 目前是只支持一个监听处理函数，这里直接修改。已经推动viola团队进行
   */
  startListen() {
    if (this.listening) return;
    this.listening = true;
    // 获取全局已经注册的全局错误监听函数
    // 监听js执行错误， 目前只支持 uncaughtException， unhandlePromiseRejection 也会在uncaughtException中被捕获
    // viola ios下暂时无法捕捉错误，下下个版本会支持
    viola.on('error', (error: Record<string, any>) => {
      // 给每一个实例发送js错误
      if (error) {
        this.publishErrorLog({
          msg: error,
          level: LogType.ERROR,
        });
      }
    });
  },
});
