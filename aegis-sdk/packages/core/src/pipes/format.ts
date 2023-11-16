import { NormalLog } from '../interface';
import { stringifyPlus } from '../util';
import { Pipe } from './index';
import { COMPLETION_KEYS } from '../constant';


// 删除空key
const removeEmptyKey = (log: NormalLog) => {
  COMPLETION_KEYS.forEach((key) => {
    if (!log[key]) {
      delete log[key];
    }
  });
  return log;
};


// 生成格式日志的pipe
export const formatNormalLogPipe: Pipe = (log: NormalLog | NormalLog[], resolve) => {
  if (Array.isArray(log)) {
    return resolve(log.map(log => (removeEmptyKey({
      ...log,
      msg:
        typeof log.msg === 'string' ? log.msg : [].concat(log.msg).map(stringifyPlus)
          .join(' '),
    }))));
  }

  return resolve([{
    ...log,
    msg: typeof log.msg === 'string' ? log.msg : stringifyPlus(log.msg),
  }]);
};
