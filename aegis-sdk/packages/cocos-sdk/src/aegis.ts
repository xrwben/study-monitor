/* eslint-disable @typescript-eslint/member-ordering */
import Core, {
  Config,
  // Plugin,
  SendOption,
  SendType,
  SendSuccess,
  SendFail,
  createThrottlePipe,
  createPipeline,
  createSpeedRepeatLimitPipe,
  buildParam,
  speedShim,
  beforeRequestHooks,
  SpeedLog,
} from 'aegis-core';
import { createSpeedNetworkRefreshPipe } from './pipes/refresh-network';
import { getSceneName } from './util/util';

// 缓存原始fetch请求，Aegis上报走原始请求
const originRequest = fetch;

// cocos-sdk特有配置
export interface CocosConfig extends Config {
  asyncPlugin?: boolean;
  reportApiSpeed?:
  | boolean
  | { urlHandler: (url: string, payload: object) => string };
  performanceMonitor?: boolean;
  /** 当前页面是否是单页应用 */
  spa?: boolean;
  /** fps上报时间间隔，默认为false不上报，设置为true的话，默认60s上报一次，单位为s */
  fpsReportInterval?: boolean | number;
  /** 获取到首屏渲染时间后调用 */
  afterRenderFirstScreen?: (firstScreenTime: number) => void;
}

// 首次执行脚本时间
const startTime = performance.now();

export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;

  public constructor(config: CocosConfig) {
    super(config);
    // 默认打开异步组件加载模式
    config.asyncPlugin = true;
    // 调用 Core 安装插件
    try {
      // 不在浏览器环境也能正常工作
      if (typeof document !== 'undefined') {
        config.uin = config.uin
          || ((document.cookie.match(/\buin=\D+(\d*)/) ?? [])[1])
          || '';
      }

      this.init(config);
      this.extendBean('sessionId', Aegis.sessionID);
      typeof document !== 'undefined' && this.extendBean('referer', encodeURIComponent(document.referrer || ''));
      config.ext1 && this.extendBean('ext1', config.ext1);
      config.ext2 && this.extendBean('ext2', config.ext2);
      config.ext3 && this.extendBean('ext3', config.ext3);
    } catch (e) {
      console.warn(JSON.stringify(e));
      console.log(
        '%cThe above error occurred in the process of initializing Aegis, '
        + 'which will affect your normal use of Aegis.\n'
        + 'It is recommended that you contact us for feedback and thank you for your support.',
        'color: red',
      );
      this.sendSDKError(e);
    }

    cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, this.afterSceneLanuch, this);
  }

  // 场景运行后触发
  public afterSceneLanuch() {
    // 场景运行后才能拿到场景名
    this.extendBean('from', getSceneName());
  }

  public get getBean() {
    // 拼接任何请求的时候都带上from字段
    return Object.getOwnPropertyNames(this.bean)
      .map(key => `${key}=${this.bean[key]}`)
      .join('&');
  }

  public reportSpeed(logs: SpeedLog | SpeedLog[]) {
    this.send({
      type: SendType.SPEED,
      url: `${this.config.speedUrl}`,
      method: 'post',
      contentType: 'application/json',
      data: speedShim(logs, this.bean),
    });
  }

  // 上报首屏耗时
  public reportFirstScreenTime(duration?: number) {
    const sceneName = getSceneName();

    const performanceUrl = this.config.performanceUrl || '';
    const splitSymbol = performanceUrl.indexOf('?') === -1 ? '?' : '&';

    duration = duration || (performance.now() - startTime);
    this.send({
      url: `${performanceUrl}${splitSymbol}sceneName=${sceneName}&firstScreenTiming=${duration}`,
      type: SendType.PERFORMANCE,
      log: {
        firstScreenTiming: duration,
      },
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
      reqPromise = originRequest(buildParam(url, options.data), {
        method: 'GET',
        headers: new Headers({}),
      });
    } else {
      if (typeof options.data === 'string') {
        options.data = options.data.replace(/eval/gi, 'evaI');
      } else {
        options.data = JSON.stringify(options.data);
      }

      const headers = options.contentType ? new Headers({ 'Content-Type': options.contentType }) : new Headers({});
      reqPromise = originRequest(url, {
        method: 'POST',
        body: options.data,
        headers,
      });
    }

    reqPromise
      .then((res) => {
        if (res?.status && String(res.status).match(/^20\d+/g)) {
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

  // 测速日志管道，之所以写在这里，是为了让所有测速日志都走同一个管道节流，尽可能的少发 http 请求
  public speedLogPipeline = createPipeline([
    // 抽样
    createSpeedRepeatLimitPipe(this.config),
    // 节流
    createThrottlePipe(this),
    // 更新网络状态，支持异步接口
    createSpeedNetworkRefreshPipe(this),
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
    logs => this.sendPipeline([
      (sendLogs, resolve) => {
        resolve({
          type: SendType.SPEED,
          url: `${this.config.speedUrl}`,
          method: 'post',
          contentType: 'application/json',
          data: speedShim(sendLogs, this.bean),
        });
      },
    ], SendType.SPEED)(logs),
  ]);

  public uploadLogs(params: any = {}, conds: any = {}) {
    this.lifeCycle.emit('uploadLogs', params, conds);
  }
}
