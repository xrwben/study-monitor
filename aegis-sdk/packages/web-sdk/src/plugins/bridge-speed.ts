import Core, {
  Plugin,
  BridgeLog,
  tryToGetRetCode,
} from 'aegis-core';

let originH5Bridge: { [props: string]: Function } = {};

export default new Plugin({
  name: 'reportBridgeSpeed',
  override: false,
  onNewAegis(aegis: Core) {
    if (!this.override) {
      this.override = true;
      this.overrideBridge(aegis);
    }
  },
  // 分发测速日志
  publishSpeed(log: BridgeLog, instance: Core) {
    this.$walk((aegis: Core) => {
      if (aegis !== instance) return;
      aegis.speedLogPipeline(log);
    });
  },
  // 覆写客户端bridge接口
  overrideBridge(aegis: Core) {
    const { config } = aegis;

    if (!config.reportBridgeSpeed || !config.h5Bridge || !config.h5BridgeFunc.length) {
      return;
    }

    // 遍历h5Bridge中的白名单接口，并进行覆写
    config.h5BridgeFunc.forEach((functionName: string) => {
      const originBridgeFunc = config.h5Bridge[functionName];
      originH5Bridge[functionName] = originBridgeFunc;
      config.h5Bridge[functionName] = (...args: any[]) => {
        const [namespace, method, param, callback] = args;
        const sendTime = Date.now();
        originBridgeFunc(namespace, method, param, (data: any) => {
          const { code, isErr } = tryToGetRetCode(data, config.api);
          const log: BridgeLog = {
            url: `${namespace}-${method}`,
            name: `${namespace}-${method}`,
            duration: Date.now() - sendTime,
            type: 'bridge',
            ret: code,
            isErr: +isErr,
          };
          this.publishSpeed(log, aegis);
          callback(data);
        });
      };
    });
  },

  unHackBridge(aegis: Core) {
    Object.keys(originH5Bridge).forEach((funcName) => {
      if (originH5Bridge[funcName]) {
        aegis.config.h5Bridge[funcName] = originH5Bridge[funcName];
      }
    });
    originH5Bridge = {};
  },

  // 对这个插件进行销毁后重置状态
  destroy(aegis: Core) {
    this.option.publishSpeed = function () { };
    this.option.unHackBridge(aegis);
    this.option.override = false;
  },
});
