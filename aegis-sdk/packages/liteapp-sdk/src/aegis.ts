/* eslint-disable @typescript-eslint/member-ordering */
import Core, {
  beforeRequestHooks, buildParam, Config, createPipeline,
  createSpeedRepeatLimitPipe, createThrottlePipe, formatNormalLogPipe, SendFail, SendOption,
  SendSuccess, SendType, SpeedLog, speedShim,
} from 'aegis-core';
import { STORE_ACTION } from './constant';
import { getCurrPageUrl, isPageRuntime, originRequest } from './util';

// 在此处添加liteapp特有配置
export interface LiteConfig extends Config {
  reportApiSpeed?: boolean; // 是否开启Api测速
  beforeReportSpeed?: (log: SpeedLog) => boolean; // 测速前判断是否需要测速

  useStore?: boolean; // 显式声明，是否使用了Store，默认为false
}


export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;

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
          contentType: 'application/json',
          method: 'post',
          data: speedShim(sendLogs, this.bean),
          log: sendLogs,
        });
      },
    ], SendType.SPEED)(logs),
  ]);

  public constructor(config: LiteConfig) {
    super(config);

    // 调用 Core 安装插件
    try {
      this.rewriteNormalLogPipeline(config);
      this.init(config);
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

  public request = (options: SendOption, success?: SendSuccess, fail?: SendFail) => {
    if (!options || typeof options.url !== 'string' || options.url === '' || !this.bean.id) {
      // 参数错误或者没有项目ID，不让发请求
      return;
    }
    // 当 options.addBean !== false 时默认带上 bean 中的参数.
    let { url } = options;
    if (options.addBean !== false) {
      url = buildParam(url, this.bean);
    }

    const requestOptions = this.genRequestParams(url, options);
    this.originRequest(requestOptions)
      .then((res: any) => {
        success?.(res);
      })
      .catch((err: any) => {
        fail?.(err);
      });
  };

  /**
   * 构造请求参数
   * @param url
   * @param options
   * @returns requestOptions
   */
  private genRequestParams(url: string, options: SendOption) {
    const method = options.method?.toLocaleLowerCase() || 'get';
    if (method === 'get') {
      return {
        url: buildParam(url, options.data),
        method: 'GET',
        headers: {},
      };
    }
    if (typeof options.data === 'string') {
      options.data = options.data.replace(/eval/gi, 'evaI');
    } else {
      options.data = JSON.stringify(options.data);
    }
    return {
      url,
      method: 'POST',
      body: options.data,
      headers: (options.contentType ? { 'Content-Type': options.contentType } : {}) as { [key: string]: string },
    };
  }

  public uploadLogs(params: any = {}, conds: any = {}) {
    this.lifeCycle.emit('uploadLogs', params, conds);
  }

  // 如果是用了store，aegis会被store和pageView分别初始化,重写pageView下的上报
  private rewriteNormalLogPipeline(config: LiteConfig) {
    if (config.useStore && isPageRuntime()) {
      config.pvUrl = ''; // 不在页面线程上报PV
      // 将pageView的上报,带上from转发到store
      this.normalLogPipeline = createPipeline([
        createThrottlePipe(this, 5),
        formatNormalLogPipe,
        (logs, resolve) => {
          const from = getCurrPageUrl(); // 把当前页面信息带在log里
          lite.store.dispatch(STORE_ACTION, { logs, from }).then(resolve);
        }]);
    }
  }
}
