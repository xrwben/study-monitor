import Core, {
  Config,
  SendOption,
  SendSuccess,
  SendFail,
  globalAny,
  createThrottlePipe,
  createPipeline,
  createSpeedRepeatLimitPipe,
  speedShim,
  buildParam,
  SpeedLog,
  SendType,
  BridgeLog,
  HippyPagePerformanceLog,
} from 'aegis-core';

import offlineLogPlugin from './plugins/offline-log';

let apiLogList: SpeedLog[] = [];

// 在此处添加web特有配置
export interface HippyConfig extends Config {
  reportApiSpeed?: boolean;
  // 默认是true，即数据采集后立即上报，可以修改为 false，当aegis实例调用 ready 方法后才开始上报
  reportImmediately?: boolean;
  reportBridgeSpeed?: boolean;
  hippyBridge?: Object;
  beforeReportSpeed?: Function;
  offlineLogLimit?: number;
  // tjg?: boolean;
  referrer?: string;
  offlineLog?: boolean;
  offlineLogExp?: number;
  reqCallback?: (data?: unknown, options?: unknown) => {};
  userAgent?: string;
  // 是否使用sdk的默认接口上报网络，而不是宿主的
  useSDKReportNetwork?: boolean;
  getNetworkType?: Function;
  getNetworkStatus?: Function;
  // 视口尺寸，正常情况下应该是window.width/height，iPad分屏等情况除外，这种情况需要调用宿主终端提供的接口获取容器的尺寸，故改为外部传入
  viewPort?: string;
}

// 缓存原始fetch请求，Aegis上报走原始请求
const originRequest = fetch;

export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;
  public hippy = globalAny.Hippy;
  public originRequest = originRequest;
  // 延迟上报是否已经ready触发上报
  public isReportReady = false;
  public reportRequestQueue: { options: SendOption, success?: SendSuccess, fail?: SendFail }[] = [];

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

  public constructor(config: HippyConfig) {
    super(config);

    // 调用 Core 安装插件
    try {
      if (config.offlineLog) this.initOfflineLog();
      this.init(config);
      this.extendBean('sessionId', Aegis.sessionID);
      this.extendBean('platform', this.getPlatform());
      this.extendBean('os', this.getOsVersion());
      this.extendBean('from', global?.encodeURIComponent(config.pageUrl || ''));
      this.extendBean('referer', global?.encodeURIComponent(config.referrer || ''));
      this.extendBean('userAgent', config.userAgent || '');
      this.extendBean('vp', config.viewPort || '');
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
    const os = globalAny?.Hippy?.device?.platform?.OS;
    if (os === 'android') return 1;
    if (os === 'ios') return 2;
    return 100;
  }

  public getOsVersion() {
    // 获取系统版本号
    const osVersion = globalAny?.Hippy?.device?.platform?.OSVersion;
    return osVersion || '1.0.0.0'; // 默认为1.0.0.0
  }

  public initOfflineLog() {
    Aegis.use(offlineLogPlugin);
  }

  public get getBean() {
    // 拼接任何请求的时候都带上from字段
    // hippy ios和安卓的实现不一样，不会encode query，因此如果userAgent里有空格的话，保留在bean里会导致报不上去
    return Object.getOwnPropertyNames(this.bean)
      .map(key => (key === 'userAgent' ? '' : `${key}=${this.bean[key]}`))
      .join('&');
  }
  public reportSpeed(logs: SpeedLog | SpeedLog[] | BridgeLog | BridgeLog[]) {
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
   * @desc 上报页面性能数据
   * @param log 性能日志log
   */
  public reportPerformanceData(log: HippyPagePerformanceLog) {
    const MAX_PERF_NUM = 15000;

    // 限制性能数据在一定的范围内，排除异常数据
    const limitPerformanceNumber = function (
      key: String,
      performanceValue: number,
      min = 0,
      max = MAX_PERF_NUM,
      defaultValue = 0
    ) {
      if (performanceValue >= min && performanceValue <= max) {
        return performanceValue;
      }

      console.warn(`The value of ${key} exceeds the limit of Aegis sdk, so we converted it to the default value of ${defaultValue}.`
        + `Limit: [${min}, ${max}].`);
      return defaultValue;
    };

    const finalLog = {
      engineInit: limitPerformanceNumber('engineInit', log.engineInit, 0, 10000),
      bundleLoad: limitPerformanceNumber('bundleLoad', log.bundleLoad, 0, 10000),
      firstScreenTiming: limitPerformanceNumber('firstScreenTiming', log.firstScreenTiming, 0, 10000),
      firstScreenRequest: limitPerformanceNumber('firstScreenRequest', log.firstScreenRequest, 0, 15000),
      loadEnd: limitPerformanceNumber('loadEnd', log.loadEnd, 0, 15000),
    };
    const { performanceUrl = '' } = this.config;

    this.sendPipeline([
      (log: HippyPagePerformanceLog, resolve: any) => {
        const param: string[] = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const key in log) {
          param.push(`${key}=${log[key]}`);
        }

        const splitSymbol = performanceUrl.indexOf('?') === -1 ? '?' : '&';
        return resolve({
          url: `${performanceUrl}${splitSymbol}${param.join('&')}`,
          type: SendType.PERFORMANCE,
          log,
        });
      },
    ], SendType.PERFORMANCE)(finalLog);
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

    // 如果用户没有传 isErr，使用 ret 是否为 0 作为默认值
    if (msg.isErr !== 0 && msg.isErr !== 1) {
      msg.isErr = Number(msg.ret !== 0);
    }

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
        isErr: 0,
      },
      msg,
    );

    apiLogList.push(log);
    // 节流
    if (apiLogList.length === 1) {
      setTimeout(() => {
        this.reportSpeed(apiLogList);
        apiLogList = [];
      }, this?.config?.delay || 1000);
    }
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

  public $request = (options: SendOption, success?: SendSuccess, fail?: SendFail) => {
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
    const headers = this.bean.userAgent ? new Headers({ 'User-Agent': this.bean.userAgent as string }) : new Headers({});
    if (options.contentType) {
      headers.append('Content-Type', options.contentType);
    }
    if (method.toLocaleLowerCase() === 'get') {
      reqPromise = this.originRequest(buildParam(url, options.data), {
        method: 'GET',
        headers,
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
        headers,
        ...options.requestConfig,
      });
    }

    reqPromise
      .then((res) => {
        if (String(res.status).match(/^20\d+/g)) {
          success?.(res.body || '');
        } else {
          fail?.(res);
        }
        this.config.reqCallback?.(res, options);
      })
      .catch((err) => {
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
}
