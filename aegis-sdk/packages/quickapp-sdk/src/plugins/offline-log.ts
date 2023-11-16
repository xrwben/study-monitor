import Core, { NormalLog, Plugin, Config, LogType, SendType } from 'aegis-core';
import { QuickappConfig } from '../aegis';

export interface ErrorMsg {
  msg: string;
  rowNum: string;
  colNum: string;
  target: string;
  level: LogType;
  from: string;
  id?: string;
  time?: number;
  uin?: string | number;
  version?: string;
}

export interface LogConfig {
  uin: number | string;
  id: number | string;
}

interface CoreWithOlog extends Core {
  getOfflineLog?: Function;
  uploadOfflineLogs?: Function;
}

const initFlog = function (aegis: CoreWithOlog) {
  const { config } = aegis;
  const { uin, id, offlineLogLimit = 20000 } = config;
  if (!uin || !id) return;

  const offlineLog = new OfflineLog({ limit: offlineLogLimit });
  aegis.lifeCycle.on('beforeWrite', (logs: NormalLog[] = []) => {
    offlineLog.save2Offline(logs, aegis.config);
  });

  aegis.getOfflineLog = () => {
    const logs = offlineLog.getLogs({ uin, id });
    offlineLog.clearLogs(uin, id);
    return logs;
  };

  aegis.uploadOfflineLogs = async (logs: NormalLog | NormalLog[]) => {
    logs = Array.isArray(logs) ? logs : [logs];
    if (!logs.length) {
      offlineLog.getLogs({ uin, id }, (storageLogs: NormalLog[]) => uploadFlog(aegis, storageLogs));
    } else {
      return uploadFlog(aegis, logs);
    }
  };
};

const uploadFlog = async function (aegis: Core, logs: NormalLog[]) {
  const { config, bean } = aegis;
  const {
    offlineUrl,
    id,
    uin,
  } = config;
  const { aid = '' } = bean || {};
  // 没有配置uin/aid或者无法获取id，则直接返回
  if ((!uin && !aid) || !id) return;

  aegis.send(
    {
      url: `${offlineUrl}/offlineAuto`,
      type: SendType.OFFLINE,
      log: SendType.OFFLINE,
    },
    (res: any) => {
      const { secretKey } = res?.data;

      // 获取秘钥失败
      if (!secretKey) return;

      try {
        aegis.send({
          url: `${offlineUrl}/offlineLog`,
          data: { logs, secretKey, id, uin, aid },
          contentType: 'application/json',
          method: 'post',
          type: SendType.OFFLINE,
          log: logs,
        });
      } catch (err) {
        console.error(err);
      }
    }, (e) => {
      console.error(e);
    },
  );
};

class OfflineLog {
  public limitSize: number;
  public offlineLog?: boolean;
  public offlineBuffer: any[] = [];

  public constructor({ limit = 20000 } = {}) {
    this.limitSize = limit;
  }

  public getStorageKey(uin?: number | string, id?: number | string) {
    return `${uin}_${id}`;
  }

  /**
   * @description 持久化存储日志
   * @param log any 日志
   */
  public insertLog = (log: any, key: string) => {
    if (!log) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = require('@system.storage');
    storage.set({
      key,
      value: log,
    });
  };

  public clearLogs = (uin?: number | string, id?: number | string) => {
    this.offlineBuffer = [];
    const storageKey = this.getStorageKey(uin, id);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const storage = require('@system.storage');
    storage.delete({
      key: storageKey,
    });
  };

  /**
   * @description 存储日志到内存中
   * @param logs 日志
   * @param config Aegis配置
   */
  public save2Offline = (logs: NormalLog | NormalLog[], config: QuickappConfig | Config) => {
    logs = Array.isArray(logs) ? logs : [logs];

    const formatLogs = logs.map((msg) => {
      if (typeof msg === 'string') {
        msg = { msg } as any;
      }

      return Object.assign({
        id: config.id,
        uin: config.uin,
        time: Date.now() - 0,
        version: config.version,
      }, msg) as ErrorMsg;
    });
    this.offlineBuffer = this.offlineBuffer.concat(formatLogs).slice(0, this.limitSize);
    const storageKey = this.getStorageKey(config.uin, config.id);
    this.insertLog(this.offlineBuffer, storageKey);
  };

  public getLogs = (opt: LogConfig, callback?: Function) => {
    const result = this.offlineBuffer.filter(log => log.id === opt.id && log.uin === opt.uin);
    if (result) {
      callback?.(result);
    } else {
      const { uin, id } = opt;
      const storageKey = this.getStorageKey(uin, id);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const storage = require('@system.storage');
      storage.get({
        key: storageKey,
        success(data: any[]) {
          callback?.(data);
        },
        fail() {
          callback?.(result);
        },
      });
    }
    return result;
  };
}

export default new Plugin({
  name: 'offlineLog',
  onNewAegis(aegis: Core) {
    initFlog(aegis);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    aegis.lifeCycle.on('onConfigChange', (_config: QuickappConfig) => {
      initFlog(aegis);
    });
  },
});
