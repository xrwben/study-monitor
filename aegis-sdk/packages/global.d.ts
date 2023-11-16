// 当前版本号，将注入到具体的 SDK 构造函数中
declare const VERSION: string;
declare const FLOG_VERSION: string;
declare const SDK_NAME: string;

// 测试
declare const DEV: boolean;
declare const JSDOM: boolean;

// Miniprogram
declare const qq: WechatMiniprogram.Wx;

// 动态打包，插件列表
declare const ASSET_SPEED: boolean;
declare const CGI_SPEED: boolean;
declare const OFFLINE_LOG: boolean;
declare const ON_ERROR: boolean;
declare const ON_CLOSE: boolean;
declare const PAGE_PERFORMANCE: boolean;
declare const WEB_VITALS: boolean;
declare const FINGER_ID: boolean;
declare const SHADOW_LOG: boolean;
declare const SPA: boolean;
declare const TJG: boolean;
declare const IS_IE: boolean;


// Viola
declare const viola: {
  requireAPI: Function;
  proxyModule: Record<string, Record<string, Function>>;
  on: (eventName: string, callback: Function) => void;
};

declare const ViolaEnv: {
  platform: string;
};

interface XMLHttpRequest {
  /**
   * xhr实例的请求方法
   **/
  aegisMethod?: string;
  /**
   * xhr实例的请求地址
   **/
  aegisUrl?: string;
  /**
   * xhr 发送开始的时间
   */
  aegisXhrStartTime: number;
  /**
   * 是否aegis发送的请求的标识位
   */
  sendByAegis?: boolean;
  /**
   * xhr 自定义请求头
   */
  aegisXhrReqHeader: Record<string, string>;
  /**
   * 请求错误类型
   */
  failType?: string;
}

interface EventTarget {
  tagName?: string;
  src?: string;
  href?: string;
}

interface History {
  [key: string]: any;
}

interface Headers {
  [key: string]: any;
  'Content-Type'?: string;
}

interface ResponseInit {
  text: Function;
  ok: Boolean;
}

interface Window {
  __errorHandler: any;
  CC_JSB: boolean;
}
