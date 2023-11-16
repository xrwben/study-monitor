import {
  stringifyPlus,
} from '../util';
import { Pipe } from './index';
import Core from '../core';
import { MAX_LOG_LENGTH } from '../constant';

export const createLimitLengthPipe = (aegis: Core): Pipe => (logs, resolve) => {
  const { config } = aegis;
  logs = logs.map((log: any) => {
    const maxLength = config.maxLength || MAX_LOG_LENGTH;
    try {
      if (!log.msg || log.msg.length <= maxLength) return log;
      log.msg = log.msg?.substring(0, maxLength);
    } catch (e) {
      log.msg = stringifyPlus(log.msg).substring(0, config.maxLength);
    }
    return log;
  });
  resolve(logs);
};
