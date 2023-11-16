import Core from '../core';
import { SendType } from '../interface';
import { Pipe } from './index';
import { completeLogs } from '../util';
import { COMPLETION_KEYS } from '../constant';

// eslint-disable-next-line
export const beforeRequestHooks = (aegis: Core, logType: SendType | undefined): Pipe  => (log, resolve) => {
  const isArray = Array.isArray(log);
  let logs = isArray ? log : [log];

  aegis.lifeCycle.emit('beforeRequest', log);

  const { beforeRequest } = aegis.config;
  if (typeof beforeRequest === 'function') {
    logs = logs.map((log: any) => {
      try {
        const res = beforeRequest({ logs: log, logType });
        if (res?.logType === logType && res?.logs) {
          // 重写
          return res.logs;
        }
        if (res === false) {
          // 拦截
          return false;
        }
        return log;
      } catch (error) {
        return log;
      }
    }).filter((log: any) => log !== false);
  }
  if (logs.length) {
    // log按照原来的类型往下传递
    // 修复单个日志包里面的ext字段，避免后台找不到ext对应关系的情况
    logs = completeLogs(logs, COMPLETION_KEYS);
    resolve(isArray ? logs : logs[0]);
  }
};
