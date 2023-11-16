import { Pipe } from './index';
import Core from '../core';

// eslint-disable-next-line max-len
const distinct = (logs: any[]): any[] => logs.filter((e, i) => e.type !== 'static' || !logs.find((log, index) => e.url === log.url && e.status === 200 && index > i));

// 节流，下一个pipe将接收到一个数组
export const createThrottlePipe = (aegis: Core, maxLength?: number): Pipe => {
  let timer: any;
  let msgs: any[] = [];
  const { config } = aegis;

  aegis.lifeCycle.on('destroy', () => {
    msgs.length = 0;
  });

  return (msg, resolve) => {
    if (Array.isArray(msg)) {
      msgs = msgs.concat(msg);
    } else {
      msgs.push(msg);
    }

    // type && (aegis.msgPool[type] = { type, msgs });
    if ((maxLength && msgs.length >= maxLength) || (aegis.sendNow && msgs.length > 0)) {
      msgs = distinct(msgs);
      resolve(msgs.splice(0, msgs.length));

      timer && clearTimeout(timer);
      return;
    }


    timer && clearTimeout(timer);

    timer = setTimeout(() => {
      timer = null;
      // aegis销毁时会清空msgs队列
      // 去重assets中错误数据
      msgs = distinct(msgs);
      if (msgs.length > 0) {
        // type && (aegis.msgPool[type] = { type, msgs: [] });
        resolve(msgs.splice(0, msgs.length));
      }
    }, config.delay);
  };
};
