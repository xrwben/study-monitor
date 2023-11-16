import Core, { Pipe, SpeedLog } from 'aegis-core';
import { getNetworkType, NetworkTypeNum } from '../plugins/device';

// 上报前更新网络状态
export const createSpeedNetworkRefreshPipe = function (aegis: Core): Pipe {
  return (log: SpeedLog | SpeedLog[], resolve) => {
    getNetworkType((networkType: NetworkTypeNum) => {
      aegis.extendBean('netType', networkType);
      resolve(log);
    });
  };
};
