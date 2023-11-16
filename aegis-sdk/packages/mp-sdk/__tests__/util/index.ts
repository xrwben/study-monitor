import path from 'path';
import simulate from 'miniprogram-simulate';

export const join = function (paths: string): string {
  return path.join(__dirname, '..', paths);
};

export const getQuery = function (url: string, name: string): string {
  const [, search] = url.split('?');
  if (!search) {
    return '';
  }
  const value = (`?${search}`)
    .match(new RegExp(`(\\?|&)${name}=([^&]*)(&|$)`)) ? decodeURIComponent(RegExp.$2) : '';

  return value;
};

export const triggerEvent = function (aegisBtn: simulate.Component<any, any, any> | undefined, method = '__test', params: string[] = [], config = {}) {
  aegisBtn?.dispatchEvent('tap', {
    detail: {
      method,
      params,
      config,
    },
  });
};
