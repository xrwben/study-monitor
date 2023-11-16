/* eslint-disable @typescript-eslint/member-ordering */
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
import { getCurrPageUrl } from './util';
import {  RequestSchedule } from './util/request-schedule';

import { getLaunchOptionsSync, wxCanIUse } from './util/wxApi';
import { env } from './adaptor';
import { SetDataConfig } from './interface';
import { offlineLogPlugin } from './plugins/offlineLog';
import { createSpeedNetworkRefreshPipe } from './pipe/refresh-network';

// 在此处添加小程序特有配置
export interface MpConfig extends Config {
  reportApiSpeed?: boolean;
  reportLoadPackageSpeed?: boolean;
  setDataReportUrl?: string;
  beforeReportSpeed?: Function;
  onBeforeRequest?: Function; // 上报之前执行
  // tjg?: boolean;
  offlineLog?: boolean;
  // dbConfig?: any;
  offlineLogExp?: number;
  offlineLogLimit?: number;
  // getNetworkType?: Function;
  enableHttp2?: boolean; // 上报请求是否启用http2，见文档：https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
  setDataReportConfig?: SetDataConfig; // setData上报配置项
}

const originRequest = env.request;


export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`;
  public static asyncPluginIndex = 0;
  public requestSchedule: RequestSchedule;

  public originRequest = originRequest;
  // 测速日志管道，之所以写在这里，是为了让所有测速日志都走同一个管道节流，尽可能的少发 http 请求
  public speedLogPipeline = createPipeline([
    // 抽样
    createSpeedRepeatLimitPipe(this.config),
    // 节流
    createThrottlePipe(this),
    // // 更新网络状态
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
    (logs) => {
      this.send({
        url: `${this.config.speedUrl}`,
        method: 'post',
        data: speedShim(logs, this.bean),
      });
    },
  ]);

  public constructor(config: MpConfig) {
    super(config);

    // 调用 Core 安装插件
    try {
      if (config.offlineLog) this.initOfflineLog();
      this.initRequestSchedule();
      this.init(config);
      this.extendBean('sessionId', Aegis.sessionID);
      this.extendBean('referer', getLaunchOptionsSync().scene || '');
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
    if (!this.bean) {
      return `from=${encodeURIComponent(getCurrPageUrl(this.config))}`;
    }
    // 拼接任何请求的时候都带上from字段
    return `${Object.getOwnPropertyNames(this.bean)
      .map(key => `${key}=${this.bean[key]}`)
      .join('&')}&from=${encodeURIComponent(getCurrPageUrl(this.config))}`;
  }

  public initOfflineLog() {
    Aegis.use(offlineLogPlugin);
  }

  public initRequestSchedule() {
    this.requestSchedule = new RequestSchedule(this.sendRequest);
  }

  public request = (options: SendOption, success?: SendSuccess, fail?: SendFail) => {
    if (!options.url || !this.bean.id) {
      // 参数错误或者没有项目ID，不让发请求
      return;
    }

    // aid 是异步生成后挂载到 aegis.bean 上，如果还未生成，先在本地队列中缓存
    if (!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(String(this.bean.aid))) {
      // this.requestQueue.push({ options, success, fail });
      this.requestSchedule.addTask({ options, success, fail });
      return;
    }

    // 为了复用请求连接，保证aegis同一时间只发出一个请求
    // 在nettype获取成功后才发起请求
    if ((wxCanIUse('getNetworkType') && this.bean.netType === undefined)) {
      // this.requestQueue.push({ options, success, fail });
      this.requestSchedule.addTask({ options, success, fail });
      return;
    }

    this.requestSchedule.addTask({ options, success, fail });
    this.requestSchedule.fireTask();
    // this.sendRequest({ options, success, fail });
  };

  private sendRequest = (options: SendOption, success?: SendSuccess, fail?: SendFail) => {
    // 当 options.addBean !== false 时默认带上 bean 中的参数.
    let { url } = options;
    // 因为 core 中需要`JSON.parse`，这里影响不大，暂时这样写
    // TODO: 想办法优化下如何不做特殊处理
    if (this.config.whiteListUrl === url) {
      const originSuccess = success;
      success = (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
        originSuccess?.(JSON.stringify(res.data));
      };
    }
    const { method = 'get' } = options;
    if (options.addBean !== false) {
      url = `${url}${url?.indexOf('?') === -1 ? '?' : '&'}${this.getBean}`;
    }
    let finalOptions: SendOption = options;

    // 拦截请求
    const { onBeforeRequest } = this.config;
    onBeforeRequest && (finalOptions = onBeforeRequest(options, this));

    if (!finalOptions || !finalOptions.url) {
      let blockMsg = '';

      if (!finalOptions || !finalOptions.url) {
        blockMsg = 'Sending request blocked. Please handle the parameters reasonably, options.url is necessary';
        console.log(blockMsg);
      }

      fail?.(blockMsg);
      this.requestSchedule.complete();

      return false;
    }

    // 上报请求是否开启http2
    const enableHttp2 = this.config.enableHttp2 || false;

    if (method === 'get') {
      url = buildParam(url, finalOptions.data);
      this.originRequest({
        url,
        enableHttp2,
        success,
        fail,
        complete: this.requestSchedule.complete,
        ...options.requestConfig,
      });
    } else {
      if (typeof finalOptions.data === 'string') {
        finalOptions.data = finalOptions.data.replace(/eval/gi, 'evaI');
      }

      this.originRequest({
        url,
        enableHttp2,
        header: finalOptions.contentType ? { 'content-type': finalOptions.contentType } : undefined,
        method: 'POST',
        data: finalOptions.data,
        success,
        fail,
        complete: this.requestSchedule.complete,
        ...options.requestConfig,
      });
    }

    return true;
  };

  public uploadLogs(params: any = {}, conds: any = {}) {
    this.lifeCycle.emit('uploadLogs', params, conds);
  }

  public reportPv(id: number) {
    if (!id) return;
    const baseQuery = `${Object.getOwnPropertyNames(this.bean)
      .filter(key => key !== 'id')
      .map(key => `${key}=${this.bean[key]}`)
      .join('&')}&from=${encodeURIComponent(getCurrPageUrl(this.config))}`;
    this.send(
      {
        url: `${this.config.url}/${id}?${baseQuery}`,
        // 不能拼接bean上去，否则bean里面的id会覆盖链接中的id
        addBean: false,
        type: SendType.CUSTOM_PV,
        log: SendType.CUSTOM_PV,
      },
      () => { },
      () => { },
    );
  }
}


