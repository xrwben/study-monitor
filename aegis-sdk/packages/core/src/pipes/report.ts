import { LogType, NormalLog, SendType, EventLog } from '../interface';
import { Pipe } from './index';
// import { buildLogParam } from '../util';
import { buildLog2Json } from '../util';
import Core from '../core';
import { REPORT_TIMEOUT } from '../constant/config';

const filterLogs = (logs: any) => {
  const newLogs = Array.isArray(logs) ? logs : [logs];
  return newLogs.map((log: NormalLog) => Object.getOwnPropertyNames(log)
    .reduce((result: NormalLog, key) => {
      // 过滤掉ctx字段
      key !== 'ctx' && (result[key] = log[key]);
      return (result as NormalLog);
    }, { level: LogType.INFO, msg: '' }));
};
/**
 * 上报
 * @param aegis 实例
 * @returns
 */
// eslint-disable-next-line
export const reportPipe =
  (aegis: Core): Pipe => (logs: NormalLog[]) => aegis.sendPipeline([(sendLogs, resolve) => resolve({
    url: aegis.config.url || '',
    data: buildLog2Json(filterLogs(sendLogs)),
    method: 'post',
    contentType: 'application/json',
    type: SendType.LOG,
    log: sendLogs,
    requestConfig: { timeout: REPORT_TIMEOUT },
    success: () => {
      const { onReport } = aegis.config;
      if (typeof onReport === 'function') {
        sendLogs.forEach((log: any) => {
          onReport(log);
        });
      }
      if (typeof resolve === 'function') {
        // 无须关注已上报日志
        resolve([]);
      }
    },
  })], SendType.LOG)(logs);


export const reportEventPipe = (aegis: Core): Pipe => (logs: EventLog[]) => {
  aegis.sendPipeline([
    (sendLogs, resolve) => {
      const payload = sendLogs.map((e: EventLog) => ({
        name: e.name,
        ext1: e.ext1 || aegis.config.ext1 || '',
        ext2: e.ext2 || aegis.config.ext2 || '',
        ext3: e.ext3 || aegis.config.ext3 || '',
      }));

      resolve({
        url: `${aegis.config.eventUrl}?payload=${encodeURIComponent(JSON.stringify(payload))}`,
        type: SendType.EVENT,
        log: sendLogs,
      });
    },
  ], SendType.EVENT)(logs);
};

export const reportCustomPipe = (aegis: Core): Pipe => (logs: any) => aegis.sendPipeline([
  (sendLogs, resolve) => {
    resolve({
      url: `${aegis.config.customTimeUrl}?payload=${encodeURIComponent(JSON.stringify({ custom: sendLogs }))}`,
      type: SendType.CUSTOM,
      log: sendLogs,
    });
  },
], SendType.CUSTOM)(logs);
