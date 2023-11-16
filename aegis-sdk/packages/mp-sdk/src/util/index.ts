import { Config, MAX_FROM_LENGTH } from 'aegis-core';

/* eslint-disable no-restricted-syntax */
const queryObjectToString = (obj: { [key: string]: string | undefined }): string => {
  if (!Object.keys(obj).length) {
    return '';
  }
  const result = Object.keys(obj).map(key => `${key}=${obj[key]}`);
  return `?${result.join('&')}`;
};

export const getCurrPageUrl = (config: Config): string => {
  // 单元测试环境不支持此方法，顺便做下兼容
  try {
    let url = '';
    if (config.pageUrl) {
      url = config.pageUrl;
    } else {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1] || {};
      const query = queryObjectToString(currentPage.options);

      url = currentPage.route ? `${currentPage.route}${query}` : '';
    }
    if (typeof config.urlHandler === 'function') {
      url = config.urlHandler();
    }
    return url.slice(0, MAX_FROM_LENGTH);
  } catch (err) {
    return '';
  }
};

export const extend = function (...args: object[]): object {
  // .length of function is 2
  if (args.length === 0) {
    // TypeError if undefined or null
    throw new TypeError('Cannot convert undefined or null to object');
  }

  const to = Object(args[0]);

  for (let index = 1; index < args.length; index++) {
    const nextSource = args[index] as any;

    if (nextSource !== null) {
      // Skip over if undefined or null
      for (const nextKey in nextSource) {
        // Avoid bugs when hasOwnProperty is shadowed
        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
          to[nextKey] = nextSource[nextKey];
        }
      }
    }
  }
  return to;
};

/**
 * 对比版本号
 * 只传一个参数则默认和当前版本对比
 */
export const compareVersion = function (ver1: string, ver2: string) {
  // 兼容外部传入参数可能为空的情况
  if (typeof ver1 !== 'string' || typeof ver2 !== 'string') {
    return false;
  }

  if (ver1 === ver2) return true;

  const v1 = ver1.split('.');
  const v2 = ver2.split('.');
  const len = Math.max(v1.length, v2.length);

  for (let i = 0; i < len; i++) {
    const v1Val = ~~v1[i];
    const v2val = ~~v2[i];

    if (v1Val < v2val) {
      return false;
    } if (v1Val > v2val) {
      return true;
    }
  }

  return false;
};

/**
 * 计算字符串所占字节数，单位 bytes
 * 由于小程序js引擎也是采用市面上常用的utf-16编码，所以采用 utf-16编码方式进行计算
**/
const calcSizeOfBytes = (str = '') => {
  str = str.replace(/[\u4e00-\u9fa5]/g, 'aa');
  return str.length * 2;
};

// 根据 dataPaths 数据对每项数据进行提取计算大小
// 在开发者工具上，size 计算出来为0，但是在真机上 size 一定会大于0
export const getDataSize = (instance: any, dataPaths: (string | number)[][]) => {
  let size = 0;
  if (!instance?.data) return size;
  dataPaths.forEach((paths: (string | number)[]) => {
    let value = instance.data[paths[0]];
    for (let i = 1, len = paths.length; i < len; i++) {
      if (!!value[paths[i]]) {
        value = value[paths[i]];
      }
    }
    let str = '';
    try {
      str = JSON.stringify(value);
    } catch (e) {
      str = '';
    }
    size += calcSizeOfBytes(str);
  });
  // 限制10M，最大显示10M
  size = Math.min(size, 10 * 1024 * 1024);
  return size;
};
