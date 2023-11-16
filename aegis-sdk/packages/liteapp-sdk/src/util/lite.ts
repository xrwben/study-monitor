
/**
 * PageView与Store通用的lite API
 */

import { buildParam } from 'aegis-core';

export const setKvItem = (
  key: string,
  item: string,
  options?: { expireTime?: number }
) => lite.kv.setItem(key, item, options); // 默认90天超时销毁

export const getKvItem = (key: string): Promise<string> => lite.kv.getItem(key);

// 当前运行环境是否为PageView
export const isPageRuntime = (): boolean => typeof setStore === 'undefined';

export const getSystemInfo = () => lite.system.getSystemInfo();


export const getCurrPageUrl = (): string => {
  try {
    if (!isPageRuntime()) {
      return 'store';
    }
    const query = lite.router?.currentQuery || {};
    const path = lite.router.currentRoute;
    if (!Object.keys(query).length) {
      return path;
    }
    return buildParam(path, query);
  } catch (err) {
    return '';
  }
};

