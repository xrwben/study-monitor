import { NormalLog } from 'aegis-core';
import Aegis from '../aegis';
import { STORE_ACTION_KEY, STORE_MODULE_NAME } from '../constant';

type UseStoreReq = { store: any, aegisFactory: () => Aegis };

const UseStore = function ({ store, aegisFactory }: UseStoreReq): any {
  if (!store.modules) {
    store.modules = {};
  }

  const aegisInstance = aegisFactory();

  Object.assign(store.modules, {
    [STORE_MODULE_NAME]: {
      namespaced: true,
      actions: {
        // 上报事件
        [STORE_ACTION_KEY](_ctx: any, { logs, from }: { logs: NormalLog[], from: string }) {
          try {
            logs.forEach(log => aegisInstance.normalLogPipeline({ ...log, from }));
          } catch (error) {
          }
        },
      },
    },
  });
  return store;
};

export { UseStore };
