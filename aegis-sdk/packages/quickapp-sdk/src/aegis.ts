import Core, {
  Config,
  SendOption,
  SendSuccess,
  SendFail,
  createThrottlePipe,
  createPipeline,
  createSpeedRepeatLimitPipe,
  speedShim,
  buildParam,
  beforeRequestHooks,
  SendType,
} from 'aegis-core';
import offlineLogPlugin from './plugins/offline-log';


// 在此处添加web特有配置
export interface QuickappConfig extends Config {
  reportApiSpeed?: boolean;
  beforeReportSpeed?: Function;
  offlineLogLimit?: number;
  // tjg?: boolean;
  offlineLog?: boolean;
  dbConfig?: any;
  offlineLogExp?: number;
}

export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;
  public originRequest = this.getFetch();
  public aegisFetch = this.originRequest;
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

  public constructor(config: QuickappConfig) {
    super(config);

    // 调用 Core 安装插件
    try {
      if (config.offlineLog) this.initOfflineLog();
      this.init(config);
      this.extendBean('sessionId', Aegis.sessionID);
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

  public initOfflineLog() {
    Aegis.use(offlineLogPlugin);
  }

  public get getBean() {
    // 拼接任何请求的时候都带上from字段
    return (
      Object.getOwnPropertyNames(this.bean)
        .map(key => `${key}=${this.bean[key]}`)
        .join('&')
    );
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
        header: {},
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
        header: options.contentType ? { 'Content-Type': options.contentType } : {},
        ...options.requestConfig,
      });
    }
    reqPromise.then((res: { status: any; body: any; }) => {
      if (String(res.status).match(/^20\d+/g)) {
        success?.(res.body || '');
      } else {
        fail?.(res);
      }
    }).catch((err: any) => {
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

  public getFetch() {
    // 改为内部引用
    // 缓存原始fetch请求，Aegis上报走原始请求
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fetch = require('@system.fetch');
    const quickappOriginFetch = (url: string, options: any) => {
      const reqObject = { url, ...options };

      if (reqObject.headers) {
        reqObject.header = reqObject.headers;
      } else {
        if (!reqObject.header) {
          reqObject.header = {};
          reqObject.header['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      }

      if (reqObject.body) {
        reqObject.data = reqObject.body;
      }

      const fetchPromise = (reqObject: { success: (...arg: any) => void; fail: (...arg: any) => void; }) => {
        const p = new Promise((resolve, reject) => {
          reqObject.success = (...arg: any) => {
            resolve(...arg);
          };
          reqObject.fail = (...arg: any) => {
            reject(...arg);
          };
          fetch.fetch(reqObject);
        });
        return p;
      };
      return fetchPromise(reqObject);
    };
    return quickappOriginFetch;
  }
}
