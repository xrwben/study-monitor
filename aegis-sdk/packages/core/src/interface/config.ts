/**
 * 配置Interface
 */
export type CoreApiConfig = {
  apiDetail?: boolean;
  reportRequest?: boolean;
  resourceTypeHandler?: Function | undefined;
  retCodeHandler?: Function | undefined;
  reqParamHandler?: Function | undefined;
  resBodyHandler?: Function | undefined;
  resHeaders?: Array<string>;
  reqHeaders?: Array<string>;
};
export interface Config {
  // id或者密钥标识符，用来分辨上报项目
  id?: string;
  // 用户标示符号
  uin?: number | string;
  aid?: boolean | string; // boolean的时候只代表是否需要这个插件， string时代表是否需要插件和具体值
  onError?: boolean;
  device?: boolean;
  env?: string;
  // 本次上报的版本号码
  version?: number | string;
  // 上报延迟时间(ms)，改时间内的所有上报将会合并上报
  delay?: number;
  // 重复上报次数(对于同一个错误超过多少次不上报)
  repeat?: number | object; // repeat为数字，则是所有日志类型的保底限制，repeat为对象则可以传入不同类型日志的重复次数限制，目前支持key为speed,以后会支持log,errorLog等等
  // 日志抽样，不知道之前为什么要这么设计，日后可能会废弃！！
  random?: number;
  // 测速日志是否抽样
  speedSample?: boolean;
  // 上报地址host
  // 允许用户配置 hostUrl 默认值，如果用户又配置了 url 等信息，将会以 url 更细粒度为准
  hostUrl?: string;
  // 上报url
  url?: string;
  maxLength?: number;
  customTimeUrl?: string;
  whiteListUrl?: string;
  offlineUrl?: string;
  pvUrl?: string;
  speedUrl?: string;
  performanceUrl?: string;
  eventUrl?: string;
  webVitalsUrl?: string;
  // 小程序setData上报接口
  setDataReportUrl?: string;
  // 自定义页面url
  pageUrl?: string;
  getNetworkType?: Function;
  // 是否监控websocket链接
  websocketHack?: boolean;
  // 生命周期
  beforeReport?: Function;
  logCreated?: Function;
  onReport?: Function;
  onWhitelist?: Function;
  api?: CoreApiConfig;
  beforeReportSpeed?: Function; // 测速上报自定义
  reportAssetSpeed?: boolean | object;
  // 统一生命周期
  beforeRequest?: Function;
  afterRequest?: Function;
  urlHandler?: Function;
  ext1?: string;
  ext2?: string;
  ext3?: string;
  destroy?: Function;
  pagePerformance?: boolean | PagePerformanceStruct;

  [key: string]: any;
}

export interface PagePerformanceStruct {
  firstScreenInfo?: false,
  urlHandler?: () => string
}
