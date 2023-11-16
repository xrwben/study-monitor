/**
 * @插件 该插件会监听页面的错误，并发布至每一个 Aegis 实例
 */
import Core, { LogType, NormalLog, Plugin, globalAny } from 'aegis-core';
export default new Plugin({
  name: 'onError',
  listening: false,
  init() {
    this.startListen();
  },
  startListen() {
    if (this.listening) return;
    this.listening = true;
    const hippy = globalAny.Hippy as any;
    // 获取全局已经注册的全局错误监听函数
    // eslint-disable-next-line no-underscore-dangle
    const { globalErrorHandle: originGlobalErrorHandle = {} } = globalAny.__GLOBAL__;
    const originUncaughtException = originGlobalErrorHandle.uncaughtException as any;
    // 监听js执行错误， 目前只支持 uncaughtException， unhandlePromiseRejection 也会在uncaughtException中被捕获
    // hippy ios下暂时无法捕捉错误，下下个版本会支持
    hippy.on('uncaughtException', (error: Error) => {
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
    });
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
