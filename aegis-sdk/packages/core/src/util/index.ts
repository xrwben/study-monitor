/* eslint-disable prefer-destructuring */
import { NormalLog, SpeedLog, BridgeLog } from '../interface';
import { MAX_FROM_LENGTH, MAX_LOG_LENGTH, TIMESTAMP_REG, URL_SPEED_IGNORE } from '../constant';
export { EventEmitter, InterfaceEventEmitter } from './event-emitter';

// 将logs转为字符串形式，例如：msg[0]=Error:%20error\n%20%20%20%20at%20http://127.0.0.1:8080/index.html:20:14&level[0]=4&msg[1]=info&level[1]=2&count=2
export const buildLogParam = function (logs: NormalLog | NormalLog[]) {
  logs = Array.isArray(logs) ? logs : [logs];

  return (
    `${logs
      .map((log: NormalLog, index) => Object.getOwnPropertyNames(log)
        .map((key: string) => `${encodeOnce(key)}[${index}]=${log[key] === undefined ? '' : encodeOnce(log[key])}`)
        .join('&'))
      .join('&')}${logs.length ? `&count=${logs.length}` : ''}`
  );
};

export const buildLog2Json = function (logs: NormalLog | NormalLog[]) {
  if (!logs || logs.length === 0) return '{}';
  logs = Array.isArray(logs) ? logs : [logs];
  const keys = Object.keys(logs[0]);
  const logObj: P = {};
  keys.forEach((key: string) => {
    logObj[key] = logs.map((log: NormalLog) => log[key]);
  });
  logObj.count = logs.length;
  return stringify(logObj);
};

interface P {
  [k: string]: any;
}
export const buildParam = (url: string, param: P): string => {
  if (typeof url !== 'string') return '';

  if (typeof param === 'object' && param) {
    const paramStr = Object.getOwnPropertyNames(param)
      .map((key) => {
        const v = param[key];
        return `${key}=${typeof v === 'string'
          ? encodeURIComponent(v)
          : encodeURIComponent(JSON.stringify(v))
        }`;
      })
      .join('&')
      .replace(/eval/gi, 'evaI');
    return `${url}${url.indexOf('?') === -1 ? '?' : '&'}${paramStr}`;
  }
  return url;
};


// 调用该方法保证所有的 string 只会进行一层 encode
export const encodeOnce = function (str: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(str));
  } catch (e) {
    // TODO stringify 出错，调用sdk出错上报
    return str;
  }
};


// 上报默认值
export enum ReportDefaultVal {
  number = -1,
  string = '',
}

// 获取上报值
export const getReportVal = function <T> (rawVal?: T, isDefaultByString?: boolean): T | ReportDefaultVal {
  if (typeof rawVal === 'number') {
    return rawVal;
  }

  if (typeof rawVal === 'string') {
    return rawVal;
  }

  return isDefaultByString ? ReportDefaultVal.string : ReportDefaultVal.number;
};

// 去掉/获取url中的query
export const formatUrl = function (url: string, isGetQuery?: boolean) {
  if (typeof url === 'string') {
    return url.split('?')[isGetQuery ? 1 : 0] || '';
  }
  return url;
};

// 限制 url 长度
export const shortUrl = function (url: string, maxLength = MAX_FROM_LENGTH) {
  // 首先去掉 url 字符串中的时间戳
  return String(url).replace(TIMESTAMP_REG, '')
    .slice(0, maxLength);
};

// 判断url是否https
export const urlIsHttps = function (url: string): boolean {
  const isHostProtocol = typeof url === 'string' && /^\//.test(url);
  return isHostProtocol ? location?.protocol === 'https:' : /^https/.test(url);
};

// 判断是否是原生方法
export const isNative = function (Ctor: any): boolean {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString());
};

// 判断请求是请求接口还是请求静态资源
// 根据content-type判断xhr、fetch的是请求接口还是请求静态资源
// 使用枚举静态资源content-type的方法，不在枚举中的类型都将视为api接口。
const assetContentType: string[] = [
  // 'application/octet-stream',
  'application/xhtml+xml',
  'application/xml',
  'application/pdf',
  'application/pkcs12',
  'application/javascript',
  'application/x-javascript',
  'application/ecmascript',
  'application/vnd.mspowerpoint',
  'application/vnd.apple.mpegurl',
  'application/ogg',
  // 'text/html',
  'text/css',
  'text/javascript',
  'image',
  'audio',
  'video',
  'video/mp2t',
];

const assetFileNameReg = /\.(json|js|css|jpg|jpeg|png|svg|apng|webp|gif|bmp|mp4|mp3|ts|mpeg|wav|webm|ogg|flv|m3u8|ttf|woff2|otf|eot|woff|html|htm|shtml|shtm|)$/ig;
// 根据文件名后缀判断请求资源是静态资源还是cgi
export const isRequestAsset = function (contentType = '', url = ''): boolean {
  const shortUrl = url.split('?')[0];
  // 这里 contentType 强转为 string，是因为曾经发现有一些浏览器返回的 contentType 是 object
  return assetFileNameReg.test(shortUrl) || assetContentType.some(type => String(contentType).indexOf(type) !== -1);
};
interface TryToGetRetCodeRsp {
  code: string;
  isErr: boolean;
}
interface TryToGetRetCodeParams {
  url?: string;
  ctx?: any;
  payload?: any;
}
let possibleRetCode: string[] = ['ret', 'retcode', 'code', 'errcode'];

export const tryToGetRetCodeAsync = (
  obj: any,
  api?: Record<string, any>,
  params?: TryToGetRetCodeParams,
  callback?: Function
) => {
  try {
    if (typeof api?.retCodeHandlerAsync === 'function') {
      // 存在retCodeHandlerAsync,此时控制权全部交给用户，用户必须返回code: string和isErr: boolean
      // data是string类型
      api.retCodeHandlerAsync(obj, params?.url, params?.ctx, (data: TryToGetRetCodeRsp) => {
        const { code, isErr } = data;
        callback?.({
          code: typeof code === 'undefined' ? 'unknown' : code,
          isErr,
        });
      });
      return;
    }

    if (typeof api?.retCodeHandler === 'function') {
      // 存在retCodeHandler,此时控制权全部交给用户，用户必须返回code: string和isErr: boolean
      // data是string类型
      const { code, isErr } = api.retCodeHandler(obj, params?.url, params?.ctx, params?.payload) || {};
      callback?.({
        code: typeof code === 'undefined' ? 'unknown' : code,
        isErr,
      });
      return;
    }

    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    // 是否是数组
    if (typeof api?.ret?.join === 'function') {
      possibleRetCode = [].concat(api.ret.map((e: string) => e.toLowerCase()));
    }
    const keys = Object.getOwnPropertyNames(obj);
    const intersection = keys.filter(key => possibleRetCode.indexOf(key.toLowerCase()) !== -1);

    if (intersection.length) {
      let code = obj[intersection[0]];
      if (code === '未知' || code === '') {
        code = 'unknown';
      }
      callback?.({
        code: `${code}`,
        isErr: code !== 0 && code !== '0' && code !== 'unknown',
      });
      return;
    }
    callback?.({
      code: 'unknown',
      isErr: false,
    });
  } catch (e) {
    callback?.({
      code: 'unknown',
      isErr: false,
    });
  }
};

export const tryToGetRetCode = (obj: any, api?: Record<string, any>, params?: TryToGetRetCodeParams):
TryToGetRetCodeRsp => {
  try {
    if (typeof api?.retCodeHandler === 'function') {
      // 存在retCodeHandler,此时控制权全部交给用户，用户必须返回code: string和isErr: boolean
      // data是string类型
      const { code, isErr } = api.retCodeHandler(obj, params?.url, params?.ctx, params?.payload) || {};
      return {
        code: typeof code === 'undefined' ? 'unknown' : code,
        isErr,
      };
    }
    if (typeof obj === 'string') {
      obj = JSON.parse(obj);
    }
    // 是否是数组
    if (typeof api?.ret?.join === 'function') {
      possibleRetCode = [].concat(api.ret.map((e: string) => e.toLowerCase()));
    }
    const keys = Object.getOwnPropertyNames(obj);
    const intersection = keys.filter(key => possibleRetCode.indexOf(key.toLowerCase()) !== -1);

    if (intersection.length) {
      let code = obj[intersection[0]];
      if (code === '未知' || code === '') {
        code = 'unknown';
      }
      return {
        code: `${code}`,
        isErr: code !== 0 && code !== '0' && code !== 'unknown',
      };
    }
    return {
      code: 'unknown',
      isErr: false,
    };
  } catch (e) {
    return {
      code: 'unknown',
      isErr: false,
    };
  }
};
// 格式化apiDetail信息
export const formatApiDetail = (data: any, invokeFunc: Function | undefined, params: { url?: string, ctx?: any }) => {
  try {
    const resData = typeof invokeFunc === 'function' ? invokeFunc(data, params?.url) || '' : data;
    return stringifyObj(resData).slice(0, MAX_LOG_LENGTH);
  } catch (e) {
    return '';
  }
};

type Replacer = (key: string, value: any) => any;
const stringifyHandler = function (): Replacer {
  const cache: WeakSet<object> = new WeakSet();
  return function (key, value) {
    if (value instanceof Error) {
      // 处理Error对象
      return `Error.message: ${value.message} \n  Error.stack: ${value.stack}`;
    } if (typeof value === 'object' && value !== null) {
      // 处理循环引用
      const isCached = cache.has(value);
      if (isCached) {
        return `[Circular ${key || 'root'}]`;
      }
      cache.add(value);
    }
    return value;
  };
};

// 处理对象中含有Error对象
// 处理循环引用
export const stringifyPlus = function (target: any): string {
  // 如果target是字符串，则直接返回，避免二次加工，导致JSON标准字符串改坏
  if (typeof target === 'string') {
    return target;
  }
  try {
    if (target instanceof Error) {
      return (
        JSON.stringify(target, stringifyHandler(), 4) || 'undefined'
      ).replace(/"/gim, ''); // 这里之所以要去掉字符串中的所有 “ " ” ，是因为传进来的是 Error 对象时会 stringify 两次
    }
    return JSON.stringify(target, stringifyHandler(), 4) || 'undefined';
  } catch (e) {
    return `error happen when aegis stringify: \n ${e.message} \n ${e.stack
    }`;
  }
};

// 处理循环引用
export const stringify = function (target: any): string {
  // 如果target是字符串，则直接返回，避免二次加工，导致JSON标准字符串改坏
  if (typeof target === 'string') {
    return target;
  }
  try {
    return (
      JSON.stringify(target, stringifyHandler()) || 'undefined'
    ); // 这里之所以要去掉字符串中的所有 “ " ” ，是因为传进来的是 Error 对象时会 stringify 两次
  } catch (e) {
    return `error happen when aegis stringify: \n ${e.message} \n ${e.stack
    }`;
  }
};
// 根据层级将对象转化为字符串，避免大对象JSON.stringify非常慢甚至卡死问题
export const stringifyObj = function (obj: any, deep = 3): string {
  let str = '';
  if (Array.isArray(obj)) {
    str += '[';
    const len = obj.length;
    obj.forEach((e, i) => {
      if (typeof e === 'object' && deep > 1) {
        str += stringifyObj(e, deep - 1);
      } else {
        str += getVStr(e);
      }
      str += `${i === len - 1 ? '' : ','}`;
    });
    str += ']';
  } else if (obj instanceof Object) {
    str = '{';
    const keys = Object.keys(obj);
    const len = keys.length;
    keys.forEach((key, index) => {
      if (typeof obj[key] === 'object' && deep > 1) {
        str += `"${key}":${stringifyObj(obj[key], deep - 1)}`;
      } else {
        str += getKVStr(key, obj[key]);
      }
      str += `${index === len - 1 || (index < len - 1 && typeof obj[keys[index + 1]] === 'undefined') ? '' : ','}`;
    });
    str += '}';
  } else {
    str += obj;
  }
  return str;
};
// 对象获取kv
const getKVStr = function (key: string, value: any) {
  const tf = typeof value;
  let str = '';
  if (tf === 'string' || tf === 'object') {
    str += `"${key}":"${value}"`;
  } else if (typeof value === 'function') {
    str += `"${key}":"function ${value.name}"`;
  } else if (typeof value === 'symbol') {
    str += `"${key}":"symbol"`;
  } else if (typeof value === 'number' || tf === 'boolean') {
    str += `"${key}": ${value}`;
  } else {
    // 去掉 undefined
  }
  return str;
};
// 数组获取值
const getVStr = function (value: any) {
  const tf = typeof value;
  let str = '';
  if (tf === 'undefined' || tf === 'symbol' || tf === 'function') {
    str += 'null';
  } else if (tf === 'string' || tf === 'object') {
    str += `"${value}"`;
  } else {
    // 数字
    str += value;
  }
  return str;
};

export const generateAid = (): string => {
  const aid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return aid;
};

// speedShim
export const speedShim = function (logs: SpeedLog | SpeedLog[] | BridgeLog | BridgeLog[], bean: any) {
  const result = {
    fetch: [] as any[],
    static: [] as any[],
    bridge: [] as any[],
  };
  const formData: any = {};

  if (Array.isArray(logs)) {
    logs.forEach((log: SpeedLog | BridgeLog) => {
      result[log.type]?.push(log);
    });
  } else {
    result[logs.type]?.push(logs);
  }

  // 拼接bean;
  formData.payload = JSON.stringify({ duration: result, ...bean });
  return formData;
};
// 多条日志在一个日志包中，部分日志有ext，但是部分没有，后台区分不出来ext是哪个日志的
// 一个上报包中可能有多条日志，如果日志为1条，或者多条日志中没有ext（ext1,ext2,ext3）字段，则不需要做什么。
// 如果日志包中存在ext字段，则其他日志也需要补齐ext字段，用空字符串补齐
export const completeLogs = function (logs: any, keys: string[] | string): any {
  if (!Array.isArray(logs) || logs.length <= 1) return logs;
  const needCompKeys: string[] = []; // 需要被补全的key
  let repairKeys: string[] = []; // 传入的待修复的key
  if (typeof keys === 'string') {
    repairKeys = [keys];
  } else {
    repairKeys = keys;
  }
  if (!repairKeys || repairKeys.length <= 0) return logs;
  repairKeys.forEach((key: string) => {
    logs.forEach((log: any) => {
      // 这是有限补全，不是无限
      // if (typeof log?.[key] !== 'undefined') {
      //   needCompKeys.push(key);
      // }
      if (log?.[key]) {
        needCompKeys.push(key);
      }
    });
  });
  if (needCompKeys.length > 0) {
    logs = logs.map((log: any) => {
      const obj: any = {};
      needCompKeys.forEach((key: string) => {
        obj[key] = '';
      });
      // obj写在前面的意思就是用后面的log覆盖前面的
      return { ...obj, ...log };
    });
  }
  return logs;
};

const BASE64_IMAGE_REG = /data:(image|text)\/.*;base64/;

/**
 * 是否忽略当前 url
 * @param url
 * @returns boolean
 */
export const isIgnoreUrl = function (url: string, hostUrl: string | undefined): boolean {
  return typeof url !== 'string'
    || !url
    || (hostUrl && url.indexOf(hostUrl) > -1) // sdk 自身接口失败不上报
    || BASE64_IMAGE_REG.test(url) // 某些版本的 ios 中会出现 base64 加载异常的报错
    || URL_SPEED_IGNORE.some(item => url.indexOf(item) > -1);
};
