/* eslint-disable @typescript-eslint/no-this-alias */
// 该插件收集各种jsbridge请求的日志
import Core, {
  Plugin,
  BridgeLog,
  LogType,
  NormalLog,
  stringifyObj,
  tryToGetRetCode,
  globalAny,
} from 'aegis-core';
import type Aegis from '../aegis';
// @ts-ignore

export default new Plugin({
  name: 'reportBridgeSpeed',
  override: false,
  onNewAegis(aegis: Core) {
    // @ts-ignore
    if (!this.override) {
      this.override = true;
      this.overrideCallNativeWithPromise(aegis);
    }
  },
  // 测速数据
  publishSpeed(log: BridgeLog) {
    this.$walk((aegis: Aegis) => {
      aegis.speedLogPipeline(log);
    });
  },
  // 日志数据
  publishNormalLog(log: NormalLog) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(log);
    });
  },
  // 覆写bridge.callNativeWithPromise
  overrideCallNativeWithPromise(aegis: Core) {
    let originCallNativeWithPromise: any = null;
    const { config } = aegis;

    if (config?.hippyBridge && typeof config.hippyBridge.callNativeWithPromise === 'function') {
      originCallNativeWithPromise = config.hippyBridge.callNativeWithPromise;
      // @ts-ignore
    } else if (typeof globalAny?.Hippy?.bridge?.callNativeWithPromise === 'function') {
      // @ts-ignore
      originCallNativeWithPromise = globalAny.Hippy.bridge.callNativeWithPromise;
    }

    if (!originCallNativeWithPromise) {
      return;
    }

    const newCallNativeWithPromise = (...args: any[]) => {
      const [moduleName, functionName, params] = args;
      const sendTime = Date.now();

      return new Promise((resolve, reject) => {
        if (moduleName === 'network' || moduleName === 'websocket') {
          originCallNativeWithPromise(...args)
            .then((res: any) => {
              resolve(res);
            })
            .catch((err: any) => {
              reject(err);
            });
          return;
        }

        const url = `${moduleName}.${functionName}`;
        const self = this;
        originCallNativeWithPromise(...args)
          .then((res: any) => {
            const duration = Date.now() - sendTime;
            const { code, isErr } = tryToGetRetCode(res, config.api);
            const log: BridgeLog = {
              name: url,
              duration,
              type: 'bridge',
              ret: code,
              isErr: +isErr,
            };
            self.publishSpeed(log);
            resolve(res);
          })
          .catch((err: any) => {
            const duration = Date.now() - sendTime;
            const log: BridgeLog = {
              name: url,
              duration,
              type: 'bridge',
              ret: -1,
              isErr: 1,
            };

            self.publishSpeed(log);
            const apiDesc = `
                BRIDGE_ERROR: ${err}
                \nres duration: ${duration}ms
                \nreq url: ${url}
                \nreq params: ${stringifyObj(params)}`;
              // 上报接口错误数据
            self.publishNormalLog({
              msg: apiDesc,
              level: LogType.BRIDGE_ERROR,
            });
            reject(err);
          });
      });
    };

    if (config?.hippyBridge && typeof config.hippyBridge.callNativeWithPromise === 'function') {
      config.hippyBridge.callNativeWithPromise = newCallNativeWithPromise;
      // @ts-ignore
    } else if (global.Hippy && typeof global.Hippy.bridge.callNativeWithPromise === 'function') {
      // @ts-ignore
      global.Hippy.bridge.callNativeWithPromise = newCallNativeWithPromise;
    }
  },
});
