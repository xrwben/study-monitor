/* eslint-disable @typescript-eslint/no-require-imports */
import Core, {
  Config,
  SendOption,
  SendSuccess,
  SendFail,
  createThrottlePipe,
  createPipeline,
  createSpeedRepeatLimitPipe,
  LogType,
  speedShim,
  buildParam,
  beforeRequestHooks,
  SendType,
  MAX_FROM_LENGTH,
} from 'aegis-core';

// import { AsyncStorage } from 'react-native';

// 在此处添加RN特有配置
export interface RNConfig extends Config {
  reportApiSpeed?: boolean;
  beforeReportSpeed?: Function;
}

// 异步加载插件配置
// TODO 下面的 aegis 类型应该为 Aegis！！后面需要改回来
// interface AsyncPluginOption {
// 	exportsConstructor?: string; // 第三方包导出的构造函数，此方法需要第三方包在script name中获取，然后暴露在window上。
// 	onAegisInit?: (aegis: Core) => void;
// 	onAegisInitAndPluginLoaded?: (
// 			aegis: Aegis,
// 			exportsConstructor?: Function
// 	) => void;
// }

// 缓存原始fetch请求，Aegis上报走原始请求
const originRequest = fetch;

export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;
  public static asyncPluginIndex = 0;
  public originRequest = originRequest;
  // 测速日志管道，之所以写在这里，是为了让所有测速日志都走同一个管道节流，尽可能的少发 http 请求
  public speedLogPipeline = createPipeline([
    // 抽样
    createSpeedRepeatLimitPipe(this.config),
    // 节流
    createThrottlePipe(this),
    // 钩子beforeReportSpeed，ps: 只有 config 中的 beforeReportSpeed 能阻止上报
    (logs, resolve) => {
      this.lifeCycle.emit('beforeReportSpeed', logs);
      // @ts-ignore
      const { beforeReportSpeed } = this.config;
      if (typeof beforeReportSpeed === 'function') {
        logs = logs.filter((log: any) => beforeReportSpeed(log) !== false);
      }
      if (logs.length) {
        return resolve(logs);
      }
    },
    beforeRequestHooks(this, SendType.SPEED),
    (logs) => {
      this.send({
        url: `${this.config.speedUrl}`,
        method: 'post',
        data: speedShim(logs, this.bean),
        contentType: 'application/json',
      });
    },
  ]);

  public constructor(config: RNConfig) {
    super(config);

    // 调用 Core 安装插件
    try {
      this.init(config);
      this.extendBean('from', this.getCurrentPageUrl());
      this.extendBean('sessionId', Aegis.sessionID);
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

  public get getBean() {
    // 拼接任何请求的时候都带上from字段
    return Object.getOwnPropertyNames(this.bean)
      .map(key => `${key}=${this.bean[key]}`)
      .join('&');
  }

  public reportError(...msg: any) {
    this.normalLogPipeline({
      msg,
      level: LogType.ERROR,
    });
  }

  public request = (options: SendOption, success?: SendSuccess, fail?: SendFail) => {
    if (!options || typeof options.url !== 'string' || options.url === '' || !this.bean.id) {
      // 参数错误或者没有项目ID，不让发请求
      return;
    }

    // 当 options.addBean !== false 时默认带上 bean 中的参数.
    let { url } = options;
    if (options.addBean !== false) {
      url = `${url}${url.indexOf('?') === -1 ? '?' : '&'}${this.getBean}`;
    }
    const method = options.method || 'get';

    let reqPromise = null;
    if (method.toLocaleLowerCase() === 'get') {
      reqPromise = this.originRequest(buildParam(url, options.data), { ...options.requestConfig });
    } else {
      if (typeof options.data === 'string') {
        options.data = options.data.replace(/eval/gi, 'evaI');
      } else {
        options.data = JSON.stringify(options.data);
      }
      reqPromise = this.originRequest(url, {
        method: 'POST',
        body: options.data,
        headers: options.contentType ? { 'Content-Type': options.contentType } : undefined,
        ...options.requestConfig,
      });
    }
    reqPromise
      .then(async (res) => {
        if (res.status < 400 && res.status > 0) {
          try {
            const data = await res.json();
            success?.(JSON.stringify(data) || '');
          } catch (e) {
            // 上报接口返回204这里会报错，但是依然是正常上报的
            success?.('');
          }
        } else {
          fail?.(res);
        }
      })
      .catch((err) => {
        fail?.(err);
      });
  };

  public uploadLogs(params: any = {}, conds: any = {}) {
    this.lifeCycle.emit('uploadLogs', params, conds);
  }

  public getAsyncStorage() {
    // 改为内部引用
    const reactNative = require('react-native');
    return reactNative.AsyncStorage;
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
}
