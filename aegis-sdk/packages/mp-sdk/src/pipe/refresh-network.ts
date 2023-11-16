import Core, { SpeedLog, Pipe } from 'aegis-core';
import { wxCanIUse } from '../util/wxApi';
import { env } from '../adaptor';
import { getNetworkType } from '../plugins/device';


// 上报前更新网络状态
export const createSpeedNetworkRefreshPipe = function (aegis: Core): Pipe {
  return (log: SpeedLog | SpeedLog[], resolve) => {
    if (wxCanIUse('getNetworkType')) {
      env.getNetworkType({
        success: (res) => {
          const networkType = getNetworkType(res.networkType);
          aegis.extendBean('netType', networkType);
          resolve(log);
        },
      });
    } else {
      resolve(log);
    }
  };
};
