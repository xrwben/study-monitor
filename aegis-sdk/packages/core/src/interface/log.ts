export enum LogType {
  INFO_ALL = '-1', // 这个类型不会被直接上报到后端，会在 whitelistPipe 中被转为INFO
  API_RESPONSE = '1', // 白名单中的用户，页面上的所有 API 返回都将会被上报
  INFO = '2',
  ERROR = '4',
  PROMISE_ERROR = '8',
  AJAX_ERROR = '16',
  SCRIPT_ERROR = '32',
  IMAGE_ERROR = '64',
  CSS_ERROR = '128',
  CONSOLE_ERROR = '256',
  MEDIA_ERROR = '512',
  RET_ERROR = '1024',
  REPORT = '2048', // 与 error 相同，会触发告警，但是不会扣分
  PV = '4096', // 页面PV
  EVENT = '8192', // 自定义事件
  PAGE_NOT_FOUND_ERROR = '16384', // 小程序 页面不存在
  WEBSOCKET_ERROR = '32768', // websocket错误
  BRIDGE_ERROR = '65536',
  LAZY_LOAD_ERROR = '131072', // 小程序异步组件加载失败
}

// 平台类型
export enum PlatTypeNum {
  android = 1,
  ios = 2,
  windows = 3,
  macos = 4,
  linux = 5,
  devtools = 6,
  other = 100,
}

// 网络类型
export enum NetworkTypeNum {
  unknown = 100,
  wifi = 1,
  net2g = 2,
  net3g = 3,
  net4g = 4,
  net5g = 5,
  net6g = 6,
}

export interface NormalLog {
  msg: any;
  level: LogType;
  [key: string]: any;
}

export interface SpeedLog {
  url: string; // 请求地址,
  isHttps: boolean; // 请求地址是否https
  method: string; // 请求方法
  type: 'static' | 'fetch'; // static 静态资源测速  fetch cgi测速
  duration?: number; // 耗时
  nextHopProtocol?: string; // HTTP 协议版本 http/1.1 h2 h3-Q050
  ret?: string | number | 'unknown'; // cgi 的状态码，如果是图片或其他的，则没有该字段
  status?: number; // http 返回码（静态资源的话成功200，失败400）
  isErr?: number; // retcode 是否成功 0: 成功 1: 失败
  payload?: any; // 额外数据，包含了cgi请求的XMLHttpRequest或response（注意：静态资源没有这个属性）
  [key: string]: any;
}

export interface BridgeLog {
  name: string, // 用于bridge测速
  type: 'bridge'; // bridge  hippy/h5 bridge测速
  duration?: number; // 耗时
  ret?: string | number | 'unknown'; // cgi 的状态码，如果是图片或其他的，则没有该字段
  isErr?: number; // retcode 是否成功 0: 成功 1: 失败
  [key: string]: any;
}

export interface PagePerformanceLog {
  dnsLookup: number;
  tcp: number;
  ssl: number;
  ttfb: number;
  contentDownload: number;
  domParse: number;
  resourceDownload: number;
  firstScreenTiming: number;
  [key: string]: any;
}

export interface HippyPagePerformanceLog {
  engineInit: number,
  bundleLoad: number,
  firstScreenTiming: number,
  firstScreenRequest: number,
  loadEnd: number,
  [key: string]: any,
}

export interface StaticAssetsLog {
  url: string; // 资源地址（无参数）,
  isHttps: boolean; // 请求地址是否https
  method: string; // 请求方法
  type: 'static' | 'fetch'; // static 静态资源测速  fetch cgi测速
  duration?: number; // 耗时
  nextHopProtocol?: string; // HTTP 协议版本 http/1.1 h2 h3-Q050
  ret?: string | 'unknown'; // cgi 的状态码，如果是图片或其他的，则没有该字段
  status?: number; // http 返回码（静态资源的话成功200，失败400）
  domainLookup: number; // DNS解析耗时（domainLookupEnd - domainLookupStart）
  connectTime: number; // connectEnd - connectStart
  urlQuery: string; // 资源请求参数（a=1&b=2）
  transferSize?: number; // 资源传输大小
}

export interface ReportTimeLog {
  name: string; // 自定义测速名称
  duration: number; // 自定义测速时长
  ext1?: string;
  ext2?: string;
  ext3?: string;
  from?: string;
}

// 自定义事件
export interface EventLog {
  name: string; // 自定义事件名称
  ext1?: string;
  ext2?: string;
  ext3?: string;
  from?: string;
}
