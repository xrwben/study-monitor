import Core, {
  Config,
  SendOption,
  SendSuccess,
  SendFail,
  // globalAny,
  createThrottlePipe,
  createPipeline,
  createSpeedRepeatLimitPipe,
  speedShim,
  buildParam,
  SpeedLog,
  SendType,
  MAX_FROM_LENGTH,
} from 'aegis-core';

import offlineLogPlugin from './plugins/offline-log';
import { fetch, weexFetch } from './fetch-proxy';

let retcodeApiLogArr: SpeedLog[] = [];
const retcodeApiCache: { [key: string]: number } = {};
const RETCODE_CACHE_MAX_REQ_COUNT = 3;
const RETCODE_CACHE_MAX_KEY_COUNT = 400;
// 在此处添加web特有配置
export interface WeexConfig extends Config {
  reportApiSpeed?: boolean;
  beforeReportSpeed?: Function;
  offlineLogLimit?: number;
  // tjg?: boolean;
  referrer?: string;
  offlineLog?: boolean;
  dbConfig?: any;
  offlineLogExp?: number;
  reqCallback?: (data?: unknown, options?: unknown) => {};
}

// @ts-ignore
// eslint-disable-next-line no-undef
const refWeex = weex;

export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;
  public weex = refWeex;
  public originRequest = fetch;
  public fetch = fetch;
  public weexFetch = weexFetch;
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
    (logs) => {
      this.reportSpeed(logs);
    },
  ]);

  public constructor(config: WeexConfig) {
    super(config);

    // 调用 Core 安装插件
    try {
      if (config.offlineLog) this.initOfflineLog();
      this.init(config);
      this.extendBean('sessionId', Aegis.sessionID);
      this.extendBean('platform', this.getPlatform());
      this.extendBean('from', this.getCurrentPageUrl(config));
      this.extendBean('referer', encodeURIComponent(config.referrer || ''));
    } catch (e) {
      console.warn(e);
      console.log(
        '%cThe above error occurred in the process of initializing Aegis, '
        + 'which will affect your normal use of Aegis.\n'
        + 'It is recommended that you contact aegis-helper for feedback and thank you for your support.',
        'color: red',
      );
      this.sendSDKError(e);
    }
  }

  public getPlatform() {
    // 平台：Android 1 iOS 2 Windows 3 MacOS 4 Linux 5 其他 100
    const os = (this.weex?.config?.env?.osName || '').toLowerCase();
    // console.log(`[debug] OS: ${os}`);
    if (os === 'android') return 1;
    if (os === 'ios') return 2;
    return 100;
  }

  public initOfflineLog() {
    Aegis.use(offlineLogPlugin);
  }

  public get getBean() {
    // 拼接任何请求的时候都带上from字段
    return Object.getOwnPropertyNames(this.bean)
      .map(key => `${key}=${this.bean[key]}`)
      .join('&');
  }
  public reportSpeed(logs: SpeedLog | SpeedLog[]) {
    this.send({
      url: `${this.config.speedUrl}`,
      method: 'post',
      data: speedShim(logs, this.bean),
      contentType: 'application/json',
      type: SendType.SPEED,
      log: logs,
    });
  }
  /**
   * @desc 上报测速
   * @param msg 测速日志log
   */
  public retcode(msg: SpeedLog) {
    if (typeof msg !== 'object') {
      console.error('retcode params should be an object');
      return;
    }
    if (!msg.url) {
      console.error('param url can not be empty!');
      return;
    }
    // 单个api不能超过指定次数上报
    if (Object.keys(retcodeApiCache).length >= RETCODE_CACHE_MAX_KEY_COUNT) return;

    if (!retcodeApiCache[msg.url]) {
      retcodeApiCache[msg.url] = 0;
    }
    retcodeApiCache[msg.url] += 1;

    // 单个页面最多允许上报的api个数 这里多个key数量判断
    if (retcodeApiCache[msg.url] > RETCODE_CACHE_MAX_REQ_COUNT) return;

    const log = Object.assign(
      {},
      {
        url: '',
        isHttps: true,
        method: 'GET',
        type: 'fetch',
        duration: 0,
        ret: 0,
        status: 200,
      },
      msg,
    );

    retcodeApiLogArr.push(log);
    // 节流
    if (retcodeApiLogArr.length === 1) {
      setTimeout(() => {
        this.reportSpeed(retcodeApiLogArr);
        retcodeApiLogArr = [];
      }, 1000);
    }
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
      reqPromise = this.originRequest(buildParam(url, options.data), {
        method: 'GET',
        headers: {},
        ...options.requestConfig,
      });
    } else {
      if (typeof options.data === 'string') {
        options.data = options.data.replace(/eval/gi, 'evaI');
      } else {
        options.data = JSON.stringify(options.data);
      }
      reqPromise = this.originRequest(url, {
        method: 'POST',
        body: options.data,
        headers: options.contentType ? { 'Content-Type': options.contentType } : {},
        ...options.requestConfig,
      });
    }
    reqPromise
      .then((res: any) => {
        // console.log(`[aegis] response: ${res.text()}`);
        if (String(res.status).match(/^20\d+/g)) {
          success?.(res);
        } else {
          fail?.(res);
        }
        this.config.reqCallback?.(res, options);
      })
      .catch((err: any) => {
        fail?.(err);
      });
  };

  public uploadLogs(params: any = {}, conds: any = {}) {
    this.lifeCycle.emit('uploadLogs', params, conds);
  }

  /**
   * @description 读取离线日志，在offlineLogPlugin中会重写改方法
   */
  public getOfflineLog() { }

  /**
   * @description 上报离线日志，在offlineLogPlugin中会重写改方法
   * @param logs 日志
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public uploadOfflineLogs(_logs: any | any[]) { }

  private getCurrentPageUrl(config: Config) {
    const url = config.pageUrl || this.weex?.config?.bundleUrl || '';
    return encodeURIComponent(url.slice(0, MAX_FROM_LENGTH));
  }
}
