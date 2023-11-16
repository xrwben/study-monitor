import { Pipe } from './index';
import { SendType } from '../interface';
import Core from '../core';
export const createPvPipe = (aegis: Core): Pipe => {
  setTimeout(() => {
    const { pvUrl = '', spa } = aegis.config;
    // web 和 小程序 中使用 spa 上报 pv 数据
    const hasSpaPlugin = ['web-sdk', 'mp-sdk'].indexOf(SDK_NAME) > -1;
    const usePvPipe = (hasSpaPlugin && !spa) || !hasSpaPlugin;

    // 如果对应的 sdk 有 spa 插件并且用户开启了 spa，pv 由 spa 插件进行上报，否则由 createPvPipe 进行上报
    if (pvUrl && usePvPipe) {
      aegis.sendPipeline([
        (_, resolve) => {
          resolve({
            url: pvUrl,
            type: SendType.PV,
          });
        },
      ], SendType.PV)(null);
    }
  }, 100);
  return (msg, resolve) => {
    resolve(msg);
  };
};
