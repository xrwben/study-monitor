/* eslint-disable @typescript-eslint/member-ordering */
import Core, {
  Config,
  CoreApiConfig,
  Plugin,
  SendOption,
  SendType,
  SendSuccess,
  SendFail,
  createThrottlePipe,
  createPipeline,
  createSpeedRepeatLimitPipe,
  buildParam,
  // REPORT_TIMEOUT,
  MAX_FROM_LENGTH,
} from 'aegis-core';
import { createSpeedNetworkRefreshPipe } from './pipes/refresh-network';
import { speedShim, loadScript } from './util';
// TODO: 配置babel，干掉这里

// web-sdk特有配置

type WebApiConfig = {
  injectTraceHeader?: 'traceparent' | 'sw8' | 'b3' | 'sentry-trace';
  injectTraceUrls?: Array<string | RegExp>;
  injectTraceIgnoreUrls?: Array<string | RegExp>;
  usePerformanceTiming?: boolean; // 使用 performance 中的时间优化 API 耗时
} & CoreApiConfig;

export interface WebConfig extends Config {
  asyncPlugin?: boolean;
  // pagePerformance?: boolean | { urlHandler: () => string, firstScreenInfo: boolean };
  reportApiSpeed?:
  | boolean
  | { urlHandler: (url: string, payload: object) => string };
  // 默认是true，即数据采集后立即上报，可以修改为 false，当aegis实例调用 ready 方法后才开始上报
  reportImmediately?: boolean;
  // tjg?: boolean;
  offlineLog?: boolean;
  dbConfig?: any;
  offlineLogExp?: number;
  getNetworkType?: Function;
  getNetworkStatus?: Function;
  reportBridgeSpeed?: boolean,
  h5Bridge?: Object,
  h5BridgeFunc?: string[],
  /** 当前页面是否是单页应用 */
  spa?: boolean;
  api?: WebApiConfig;
}

// 异步加载插件配置
interface AsyncPluginOption {
  // 第三方包导出的构造函数，此方法需要第三方包在script name中获取，然后暴露在window上。
  exportsConstructor?: string;
  onAegisInit?: (aegis: Core) => void;
  onAegisInitAndPluginLoaded?: (aegis: Aegis, exportsConstructor?: Function) => void;
}

let asyncPluginIndex = 0;
export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;
  public sendNow = false;
  // 延迟上报是否已经ready触发上报
  public isReportReady = false;
  public reportRequestQueue: { options: SendOption, success?: SendSuccess, fail?: SendFail }[] = [];

  // 首屏时间信息记录
  public firstScreenInfo: {
    element: any;
    timing: number;
    [key: string]: any;
  };

  public constructor(config: WebConfig) {
    super(config);
    // 默认打开异步组件加载模式
    config.asyncPlugin = true;

    // 调用 Core 安装插件
    try {
      // 不在浏览器环境也能正常工作
      if (typeof document !== 'undefined') {
        config.uin = config.uin
          || ((document.cookie.match(/\buin=\D+(\d*)/) ?? [])[1])
          || ((document.cookie.match(/\bilive_uin=\D*(\d+)/) ?? [])[1])
          || '';
      }

      this.init(config);
      this.extendBean('sessionId', Aegis.sessionID);
      this.extendBean('from', this.getCurrentPageUrl());
      typeof document !== 'undefined' && this.extendBean('referer', encodeURIComponent(document.referrer || ''));
      config.ext1 && this.extendBean('ext1', encodeURIComponent(config.ext1));
      config.ext2 && this.extendBean('ext2', encodeURIComponent(config.ext2));
      config.ext3 && this.extendBean('ext3', encodeURIComponent(config.ext3));
    } catch (e) {
      console.warn(e);
      console.log(
        '%cThe above error occurred in the process of initializing Aegis, '
        + 'which will affect your normal use of Aegis.\n'
        + 'It is recommended that you contact us for feedback and thank you for your support.',
        'color: red',
      );
      this.sendSDKError(e);
    }
  }

  public getBean(filter: string[] = []) {
    return `${Object.getOwnPropertyNames(this.bean)
      .filter(key => filter.indexOf(key) === -1)
      .map((key) => {
        if (key === 'from') {
          // issue 734: bean中的from参数仅在初始化赋值，对于SPA应用，bean中的from参数需要动态获取最新
          return `from=${this.getCurrentPageUrl()}`;
        }
        return `${key}=${this.bean[key]}`;
      })
      .join('&')}`;
  }

  private getCurrentPageUrl() {
    // 获取当前站点url，按优先级从urlHandler/pageUrl/location.href获取，默认为location.href
    let url = this.config.pageUrl || location.href;
    if (typeof this.config.urlHandler === 'function') {
      url = this.config.urlHandler();
    }
    url = url.slice(0, MAX_FROM_LENGTH);
    return encodeURIComponent(url);
  }

  public ready() {
    const run = () => {
      if (!this.reportRequestQueue.length) {
        return;
      }
      const [{ options, success, fail }] = this.reportRequestQueue.splice(0, 1);
      this.$request(options, (...arg) => {
        try {
          return success?.apply(options, arg);
        } finally {
          run();
        }
      }, (...arg) => {
        try {
          return fail?.apply(options, arg);
        } finally {
          run();
        }
      });
    };
    run();
    this.isReportReady = true;
  }

  public request(_options: SendOption, _success?: SendSuccess, _fail?: SendFail) {
    if (!this.config.reportImmediately && !this.isReportReady) {
      this.reportRequestQueue.push({
        options: _options,
        success: _success,
        fail: _fail,
      });
      return;
    }
    this.$request(_options, _success, _fail);
  }

  private $request(options: SendOption, success?: SendSuccess, fail?: SendFail) {
    if (!options || typeof options.url !== 'string' || options.url === '' || !this.bean.id) {
      // 参数错误或者没有项目ID，不让发请求
      return;
    }

    let { url } = options;

    if (options.addBean !== false) {
      url = `${url}${url.indexOf('?') === -1 ? '?' : '&'}${this.getBean(options.beanFilter)}`;
    }

    options.url = url;

    const method = options.method || 'get';

    const { onBeforeRequest } = this.config;
    // 将所有权限全部给调用方，调用方可以做所有事情。但是这里会有一个风险，如果调用方胡乱封装数据，会不会导致后台解析报错从而引起服务直接挂了~!!
    onBeforeRequest && (options = onBeforeRequest(options, this));

    if (!options) {
      return console.warn('Sending request blocked');
    }

    if (!options.url) {
      return console.warn('Please handle the parameters reasonably, options.url is necessary');
    }

    if ((options?.sendBeacon || this.sendNow) && typeof navigator?.sendBeacon === 'function') {
      navigator.sendBeacon(options.url, options.data);
      return;
    }

    const xhr = new XMLHttpRequest();
    // aegis的所有上报都使用的 “send” 方法，在这里加上标志，防止 aegis 监听到自己的请求造成递归
    xhr.sendByAegis = true;
    // 去掉默认timeout,避免同步timeout报错
    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 400 || xhr.status === 0) {
          fail?.(xhr.response);
        } else {
          success?.(xhr.response);
        }
      }
    });
    if (method.toLocaleLowerCase() === 'get') {
      xhr.open('get', buildParam(options.url, options.data));
      xhr.send();
    } else {
      xhr.open('post', options.url);

      if (options.contentType) {
        xhr.setRequestHeader('Content-Type', options.contentType);
      }
      if (typeof options.data === 'string') {
        options.data = options.data.replace(/eval/gi, 'evaI');
      }

      xhr.send(options.data);
    }
  }

  // 测速日志管道，之所以写在这里，是为了让所有测速日志都走同一个管道节流，尽可能的少发 http 请求
  public speedLogPipeline = createPipeline([
    // 节流
    createThrottlePipe(this),
    // 抽样
    createSpeedRepeatLimitPipe(this.config),
    // 更新网络状态，支持异步接口
    createSpeedNetworkRefreshPipe(this),
    // 钩子beforeReportSpeed，ps: 只有 config 中的 beforeReportSpeed 能阻止上报
    (logs, resolve) => {
      this.lifeCycle?.emit('beforeReportSpeed', logs);
      const { beforeReportSpeed } = this.config;
      if (typeof beforeReportSpeed === 'function') {
        logs = logs.filter((log: any) => {
          const shouldReport = beforeReportSpeed(log) !== false;
          return shouldReport;
        });
      }
      if (logs.length) {
        return resolve(logs);
      }
    },
    logs => this.sendPipeline([
      (sendLogs, resolve) => {
        resolve({
          type: SendType.SPEED,
          url: `${this.config.speedUrl}`,
          method: 'post',
          data: speedShim(sendLogs, {
            ...this.bean,
            // issue 734: bean中的from参数仅在初始化赋值，对于SPA应用，bean中的from参数需要动态获取最新
            from: this.getCurrentPageUrl(),
          }),
          log: sendLogs,
        });
      },
    ], SendType.SPEED)(logs),
  ]);

  // 异步加载插件
  private static asyncPlugin: { [key: string]: string } = {};
  public static useAsyncPlugin(url: string, options: AsyncPluginOption = {}) {
    const {
      exportsConstructor = `aegis-plugin-${asyncPluginIndex}`,
      onAegisInit = () => { },
      onAegisInitAndPluginLoaded = () => { },
    } = options;
    asyncPluginIndex += 1;
    if (typeof url !== 'string') throw new TypeError('useAsyncPlugin first param must be string');
    if (typeof onAegisInit !== 'function' || typeof onAegisInitAndPluginLoaded !== 'function') throw new TypeError('onAegisInit and onAegisInitAndPluginLoaded must be function');

    this.use(new Plugin<Aegis>({
      name: 'asyncPlugin',
      onNewAegis(aegis) {
        try {
          onAegisInit(aegis);
          if (Aegis.asyncPlugin[url]) {
            onAegisInitAndPluginLoaded(
              aegis,
              // @ts-ignore
              window[Aegis.asyncPlugin[url]],
            );
          } else {
            loadScript(url, exportsConstructor, (err: boolean) => {
              if (err) return;
              Aegis.asyncPlugin[url] = exportsConstructor;
              // @ts-ignore
              const ctr = window[exportsConstructor];
              onAegisInitAndPluginLoaded(aegis as Aegis, ctr);
            });
          }
        } catch (e) {
          console.log(`error on below is caused by ${url} `);
          console.error(e);
        }
      },
    }));
  }

  public publishPluginsLogs() {
    const assetsSpeed = Aegis.installedPlugins.find(item => item.name === 'reportAssetSpeed');
    assetsSpeed?.option.collectNotReportedLog(this);
  }

  public uploadLogs(params: any = {}, conds: any = {}) {
    this.lifeCycle?.emit('uploadLogs', params, conds);
  }

  public static urls: { [key: string]: string } = {
    aegisCollect: 'https://aegis.qq.com/collect',
    flog: `https://cdn-go.cn/vasdev/web_webpersistance_v2/${FLOG_VERSION}/flog.core.min.js`,
  };
}
