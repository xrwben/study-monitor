import { Pipe, Config } from 'aegis-core';

// 批量上报，下一个pipe将接收到一个数组
export const createBatchReportPipe = function (
  config?: Config,
  option?: {
    maxLength?: number;
    batchNum?: number; // 批量上报的条数
    allowNextRound?: () => boolean;
  },
): Pipe {
  let timer: NodeJS.Timeout | undefined | number;
  const msgs: any[] = [];
  const { maxLength, batchNum } = option || {};

  return function (msg, resolve) {
    msgs.push(msg);

    if (maxLength && msgs.length >= maxLength) {
      resolve(msgs.splice(0, msgs.length));
    }
    if (typeof timer === 'undefined') {
      const startUp = () => {
        let should: boolean | undefined = option?.allowNextRound?.();
        if (typeof should === 'undefined') should = true;
        if (!should) {
          clearTimeout(timer as NodeJS.Timeout);
          timer = undefined;
          return;
        }
        timer = setTimeout(() => {
          const msg = msgs.splice(0, batchNum || 10);
          msg.length > 0 && resolve(msg);
          if (msgs.length > 0) {
            startUp();
          } else {
            timer = undefined;
          }
        }, config?.batchReportInterval || 1000);
      };
      startUp();
    }
  };
};
