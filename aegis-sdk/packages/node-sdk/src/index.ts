import Core, {
  Config,
  SendFail,
  SendOption,
  SendSuccess,
  SpeedLog,
  createPipeline,
  beforeRequestHooks,
  SendType,
} from 'aegis-core';

import { BaseProtocal, ProtocalClassType } from './protocol/protocol_base';
import { SelectorBase, SelectorClassType } from './selector/selector_base';
import IPSelector from './selector/ip_selector';
import PolarisSelector from './selector/polaris_selector';
import HttpProtocol from './protocol/protocol_http';
import { createBatchReportPipe } from './pipes/batch-report-pipe';
// import { IPSelector } from './selector/ip_selector';

// const LOG_IP = 'http://9.148.195.201';
// const SPEED_IP = 'http://9.148.194.104/speed';
// const URL_LOG = 'log';
// const URL_SPEED = 'speed';

const SELECTOR_MAP = {
  host: 'ip_selector',
  ip: 'ip_selector',
  polaris: 'polaris_selector',
};
const PROTOCOL_MAP = {
  http: 'protocol_http',
  https: 'protocol_http',
  // trpc: 'protocol_trpc'
};
export default class Aegis extends Core {
  // 注入version（从package.json中获取）
  public static sessionID = `session-${Date.now()}`; // TODO: aegis sessionID 修改
  public reportSpeedLog = createPipeline([
    createBatchReportPipe(this.config, {
      batchNum: 5,
      maxLength: 50,
    }),
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
      const result = {
        fetch: [] as SpeedLog[],
      };
      logs.forEach((log: SpeedLog) => result.fetch.push(log));
      this.send({
        url: `${this.config.speedUrl}`,
        method: 'post',
        data: `payload=${encodeURIComponent(JSON.stringify({ duration: result }))}`,
      });
    },
  ]);
  protected selector: SelectorBase;
  protected reqProtocol: BaseProtocal;
  public constructor(config: Config) {
    super(config);
    this.config.repeat = 0;
    // 调用 Core 安装插件
    try {
      this.init(config);
      this.bean.sessionId = Aegis.sessionID;
      this.bean.from = config.pageUrl || '';
      this.initSelector();
      this.initProtocol();
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
  public request(options: SendOption, success?: SendSuccess, fail?: SendFail) {
    if (!options || typeof options.url !== 'string' || !this.bean.id) {
      // 参数错误或者没有项目ID，不让发请求
      return;
    }
    if (typeof options.url === 'string') {
      if (~options.url.indexOf('/whitelist')) {
        // TODO: 需要评审下这里是否需要有白名单机制还是全量上报
        return success?.('{"retcode":0,"result":{"is_in_white_list":true}}');
      }
      // let url = options.url
      //     .replace(
      //         'https://aegis.qq.com/speed', // 先解析测速
      //         URL_SPEED
      //     )
      //     .replace(
      //         'https://aegis.qq.com', // 再解析日志
      //         URL_LOG
      //     );
      this.reqProtocol.send(options, {
        success,
        fail,
        bean: this.getBean,
      });
      return;
    }
  }
  public setSessionID(sessionId?: string) {
    this.extendBean('sessionId', sessionId || `session-${Date.now()}`);
  }
  protected initSelector() {
    this.config.selector = this.config.selector || {
      type: 'polaris', // 默认使用北极星
    };
    if (!this.config.selector.type) throw new Error('selector type 不能为空');
    const { type } = this.config.selector;
    let M: SelectorClassType;
    // this.selector = new m(this.config.selector);
    switch (type) {
      case 'host':
      case 'ip':
        M = IPSelector;
        break;
      case 'polaris':
        M = PolarisSelector;
        break;
      default:
        throw new Error(`selector 类型非法，可选值: ${Object.keys(SELECTOR_MAP).toString()}`);
    }
    this.selector = new M(this.config.selector);
  }
  protected initProtocol() {
    if (!this.config.protocol) {
      if (this.config.selector?.type === 'host') {
        this.config.protocol = 'https';
      } else {
        this.config.protocol = 'http';
      }
    }
    if (Object.keys(PROTOCOL_MAP).indexOf(this.config.protocol) === -1) throw new Error('unknown protocol');
    let M: ProtocalClassType;
    switch (this.config.protocol) {
      case 'http':
      case 'https':
        M = HttpProtocol;
        break;
      // case 'trpc': TODO:// trpc协议后期支持
      //     m = require('./selector/l5_selector').default;
      //     break;
      default:
        throw new Error(`selector 类型非法，可选值: ${Object.keys(PROTOCOL_MAP).toString()}`);
    }
    this.reqProtocol = new M({
      selector: this.selector,
      protocol: this.config.protocol,
      keepalive: typeof this.config.keepalive === 'boolean' ? this.config.keepalive : false,
    });
  }
  public get getBean() {
    return Object.getOwnPropertyNames(this.bean || {})
      .map(key => `${key}=${this.bean[key]}`)
      .join('&');
  }
}
