import { Pipe } from './index';
import { Config } from '../interface';

// 写入前做一些处理
// 这里虽然很不好理解，也不好看，不过建议用箭头函数
export const createWriteReportPipe =  (emit: Function, config: Config): Pipe =>  (msg, resolve) => {
  const { logCreated } = config;
  if (typeof logCreated === 'function') {
    const logs = msg.filter((log: any) => logCreated(log) !== false);
    emit('beforeWrite', logs);
    return resolve(logs);
  }
  emit('beforeWrite', msg);
  return resolve(msg);
};
