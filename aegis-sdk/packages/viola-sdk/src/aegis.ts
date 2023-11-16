/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import Core, {
  Config,
  SendOption,
  SendSuccess,
  SendFail,
  createThrottlePipe,
  createPipeline,
  createSpeedRepeatLimitPipe,
  speedShim,
  beforeRequestHooks,
  SendType,
} from 'aegis-core';

const fetch = function (options: Record<string, any>, cb: Function) {
  return new Promise((resolve, reject) => {
    viola.requireAPI('http').request(options, (res: any) => {
      if (typeof res === 'string') {
        res = JSON.parse(res);
      }
      if (res.success) {
        resolve(res.data);
      } else {
        reject(res.errorText);
      }
      cb(res);
    });
  });
};

// 在此处添加特有配置
export interface ViolaConfig extends Config {
  reportApiSpeed?: boolean;
  beforeReportSpeed?: Function;
  // tjg?: boolean;
  offlineLog?: boolean;
  dbConfig?: any;
  offlineLogExp?: number;
  extRequestOpts?: { [key: string]: string | number | boolean };
}

/**
 * 平台编码
 */
enum PLATFORM {
  /** 安卓 */
  ANR = 1,
  /** iOS */
  IOS = 2,
  /** 其他(默认) */
  DEFAULT = 100
}

export default class Aegis extends Core {
  // 注入 version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;
  public static asyncPluginIndex = 0;
  public originRequest = fetch;
  public extRequestOpts = {};

  // 测速日志管道，之所以写在这里，是为了让所有测速日志都走同一个管道节流，尽可能的少发 http 请求
  public speedLogPipeline = createPipeline([
    // 抽样
    createSpeedRepeatLimitPipe(this.config),
    // 节流
    createThrottlePipe(this),
    // 钩子beforeReportSpeed，ps: 只有 config 中的 beforeReportSpeed 能阻止上报
    (logs, resolve) => {
      this.lifeCycle.emit('beforeReportSpeed', logs);
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

  public constructor(config: ViolaConfig) {
    super(config);

    // 调用 Core 安装插件
    try {
      this.init(config);
      this.extendBean('sessionId', Aegis.sessionID);
      this.extendBean('platform', this.getPlatform());
      this.initViolaConfig(config);
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
  /**
   * 获取平台编号
   */
  public getPlatform(): PLATFORM {
    // violaPlatform与平台编码映射
    const platform: Record<string, number> = {
      android: PLATFORM.ANR,
      ios: PLATFORM.IOS,
    };
    const os = ViolaEnv.platform.toLowerCase();
    return platform[os] || PLATFORM.DEFAULT;
  }

  /**
   * 设置viola-sdk专用配置
   */
  public initViolaConfig(config: ViolaConfig): void{
    const { extRequestOpts } = config;
    extRequestOpts && (this.extRequestOpts = extRequestOpts);
  }

  // 拼接任何请求的时候都带上from字段
  public get _bean() {
    return Object.getOwnPropertyNames(this.bean)
      .map(key => `${key}=${this.bean[key]}`)
      .join('&');
  }

  public request = (options: SendOption, success?: SendSuccess, fail?: SendFail) => {
    // 参数检查
    if (!options || typeof options.url !== 'string' || options.url === '' || !this.bean.id) {
      return;
    }

    // 处理 url
    let { url } = options;
    if (options.addBean !== false) {
      // 当 options.addBean !== false 时默认带上 _bean
      url = `${url}${url.indexOf('?') === -1 ? '?' : '&'}${this._bean}`;
    }

    // 发送请求
    const method = options.method || 'get';
    let reqPromise = null;
    if (method.toLocaleLowerCase() === 'get') {
      reqPromise = this.originRequest(
        {
          method: 'GET',
          url,
          data: options.data,
          headers: {
            Referer: 'http://kandian.qq.com/',
          },
          ...this.extRequestOpts,
          ...options.requestConfig,
        },
        () => { },
      );
    } else {
      let data: any = {};
      if (typeof options.data === 'string') {
        options.data.split('&').forEach((item: string) => {
          const [k, v] = item.split('=');
          data[k] = v;
        });
      } else {
        data = options.data;
      }
      reqPromise = this.originRequest(
        {
          url,
          method: 'POST',
          data,
          headers: options.contentType ? { 'Content-Type': options.contentType } : undefined,
          ...this.extRequestOpts,
          ...options.requestConfig,
        },
        () => { },
      );
    }

    // 回包处理
    reqPromise
      .then((res: any) => {
        success?.(JSON.stringify(res));
      })
      .catch((err: Error) => {
        fail?.(err);
      });
  };

  public uploadLogs(params: any = {}, conds: any = {}) {
    this.lifeCycle.emit('uploadLogs', params, conds);
  }
}
