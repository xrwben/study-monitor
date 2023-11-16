export interface SendOption {
  url: string;
  method?: 'get' | 'post';
  contentType?: string;
  data?: any;
  addBean?: boolean; // 发送send请求时是否需要拼接上bean
  from?: string; // 测速时from获取不准确，用作矫正
  beanFilter?: string[]; // 不需要拼接的bean的key的数组
  type?: SendType; // 待发送的接口类型
  log?: any; // 原始log
  success?: (data: any) => void;
  fail?: (err: any) => void;
  sendBeacon?: boolean; // 是否使用sendBeacon上报
  requestConfig?: {[key: string]: any};
}

export enum SendType {
  LOG = 'log',  // 日志
  SPEED = 'speed', // 接口和静态资源测速
  PERFORMANCE = 'performance', // 页面测速
  OFFLINE = 'offline', // 离线日志上传
  WHITE_LIST = 'whiteList', // 白名单
  VITALS = 'vitals', // vitals
  PV = 'pv', // pv
  CUSTOM_PV = 'customPV', // 自定义pv
  EVENT = 'event', // 自定义事件
  CUSTOM = 'custom', // 自定义测速
  SDK_ERROR = 'sdkError', // sdk报错
  SET_DATA = 'setData', // 小程序 set data
  LOAD_PACKAGE = 'loadPackage', // 小程序包下载
}

export type SendSuccess = (data: any) => void;

export type SendFail = (err: any) => void;
