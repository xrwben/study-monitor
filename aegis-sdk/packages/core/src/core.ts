/* eslint-disable @typescript-eslint/member-ordering */
import {
  getDefaultConfig,
  setConfigUrl,
  MAX_FAIL_REQUEST_NUM,
  MAX_FROM_LENGTH,
  FORBIDDEN_RESPONSE_DATA,
} from './constant';
import {
  InterfaceEventEmitter,
  EventEmitter,
  stringifyPlus,
} from './util';
import {
  Config,
  LogType,
  Environment,
  SendOption,
  SendSuccess,
  SendFail,
  SpeedLog,
  BridgeLog,
  ReportTimeLog,
  SendType,
  EventLog,
  NormalLog,
} from './interface';
import Plugin from './plugin';
import {
  createThrottlePipe,
  createPipeline,
  formatNormalLogPipe,
  createLimitLengthPipe,
  createWhitelistPipe,
  createPvPipe,
  createWriteReportPipe,
  createErrorLogLimitPipe,
  reportPipe,
  createRandomSamplePipe,
  beforeRequestHooks,
  modifyRequestHooks,
  afterRequestHooks,
  Pipe,
  reportEventPipe,
  reportCustomPipe,
} from './pipes';
import { isEnvironment } from './interface/env';

const assignEmptyFunctionToObject = function (obj: object, sourceObj?: object) {
  const properties = Object.getOwnPropertyNames(obj);
  properties.forEach((item) => {
    // @ts-ignore
    if (typeof obj[item] === 'function' && item !== 'constructor') {
      if (sourceObj) {
        // sendPipeline是一个高阶函数，通过调用createPipeline返回一个函数，这里需要兼容
        // @ts-ignore
        sourceObj[item] = item === 'sendPipeline' ? () => () => { } : function () { };
      } else {
        // @ts-ignore
        obj[item] = function () { };
      }
    }
  });
};

const assignNullToObject = function (obj: object, sourceObj?: object) {
  const propertyDescriptors = Object.getOwnPropertyDescriptors(obj);
  Object.keys(propertyDescriptors).forEach((item) => {
    if (!propertyDescriptors[item].writable) return;

    if (sourceObj) {
      // @ts-ignore
      sourceObj[item] = null;
    } else {
      // @ts-ignore
      obj[item] = null;
    }
  });
};

export default class Core {
  // 将version作为全局对象
  public static version = VERSION;
  // public static __version__ = VERSION;
  public static instances: Core[] = [];
  public constructor(config: Config) {
    // 如果用户配置了 hostUrl， 则自动生成对应的全部链接地址
    this.config = setConfigUrl(this.config, config.hostUrl);
    Core.instances.push(this);
  }
  public get __version__() {
    console.warn('__version__ has discard, please use version');
    return VERSION;
  }
  // 所有的日志类型
  // public static LogType = LogType;
  public isGetSample = false;
  public isHidden = false;
  public static logType = LogType;
  public get LogType() {
    console.warn('LogType has discard, please use logType');
    return LogType;
  }
  public static environment = Environment;
  // 配置项
  public config: Config = getDefaultConfig();
  public isWhiteList = false;
  // 生命周期
  public lifeCycle: InterfaceEventEmitter = new EventEmitter();
  // 继承 Core 时需要提供该方法，send 在发送请求时，必须将 bean 中的数据拼接到 url 中
  public bean: { [key: string]: string | number | boolean } = {};
  public sendNow: boolean;

  public init(config: Config) {
    this.setConfig(config);

    // 执行已经安装的插件
    // ps：这里只能用for循环，因为插件里可能会安装其他插件
    // 如果使用forEach，后续安装的插件将遍历不到
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < Core.installedPlugins.length; i++) {
      try {
        Core.installedPlugins[i].patch(this);
      } catch (e) {
        this.sendSDKError(e);
      }
    }

    this.lifeCycle.emit('onInited');
  }

  // 设置配置
  public setConfig(config: Partial<Config>) {
    Object.assign(this.config, config);
    const { id, uin, version, ext1, ext2, ext3, aid, env = 'production', pageUrl } = this.config;
    const shouldSendWhiteList = this.bean.id !== id || this.bean.uin !== uin || this.bean.aid !== aid;
    this.bean.id = id || '';
    this.bean.uin = uin || '';
    this.bean.version = version || VERSION;
    this.bean.aid = aid || '';
    // 环境赋值
    this.bean.env = isEnvironment(env) ? env : Environment.others;

    pageUrl && this.extendBean('from', encodeURIComponent(pageUrl.slice(0, MAX_FROM_LENGTH)));

    ext1 && this.extendBean('ext1', encodeURIComponent(ext1));
    ext2 && this.extendBean('ext2', encodeURIComponent(ext2));
    ext3 && this.extendBean('ext3', encodeURIComponent(ext3));
    shouldSendWhiteList && this.lifeCycle.emit('onConfigChange', this.config);
    return this.config;
  }

  // 插件
  public static installedPlugins: Plugin[] = [];
  public static use(plugin: Plugin) {
    if (Core.installedPlugins.indexOf(plugin) === -1 && plugin.aegisPlugin) {
      Core.installedPlugins.push(plugin);
    }
  }
  public static unuse(plugin: Plugin) {
    const index = Core.installedPlugins.indexOf(plugin);
    if (index !== -1) {
      Core.installedPlugins.splice(index, 1);
    }
  }
  // info 仅对白名单生效的数据上报，日志类型是一般日志
  public info(...msg: any): void {
    const log: NormalLog = { level: LogType.INFO, msg };
    // 完整类型数据
    msg.length === 1 && msg[0].msg && Object.assign(log, { ...msg[0] }, { level: LogType.INFO });
    this.normalLogPipeline(log);
  }
  // infoAll 所有用户调用都会生效的接口，日志类型是一般日志
  public infoAll(...msg: any): void {
    const log: NormalLog = { level: LogType.INFO_ALL, msg };
    // 完整类型数据
    msg.length === 1 && msg[0].msg && Object.assign(log, { ...msg[0] }, { level: LogType.INFO_ALL });
    this.normalLogPipeline(log);
  }
  // report 所有用户调用都生效，可以传日志类型进来，默认日志类型是 aegis.report
  public report(...msg: any): void {
    const log: NormalLog = { level: LogType.REPORT, msg };
    // 完整类型数据
    msg.length === 1 && msg[0].msg && Object.assign(log, { ...msg[0] });
    this.normalLogPipeline(log);
  }
  // error 所有用户调用都生效，默认日志类型是错误日志
  public error(...msg: any): void {
    const log: NormalLog = { level: LogType.ERROR, msg };
    // 完整类型数据
    msg.length === 1 && msg[0].msg && Object.assign(log, { ...msg[0] }, { level: LogType.ERROR });
    this.normalLogPipeline(log);
  }
  // 基础上报
  public normalLogPipeline = createPipeline([
    // 节流，之后的logs都将是数组
    createThrottlePipe(this, 5),
    // 格式化
    formatNormalLogPipe,
    // 日志长度限制
    createLimitLengthPipe(this),
    // createRandomSamplePipe(this),
    // 同一个错误只上报5次
    createErrorLogLimitPipe(this.config),
    // 在日志过滤写入之前处理一些杂事
    createWriteReportPipe(this.lifeCycle.emit, this.config),
    // pv上报
    createPvPipe(this),
    // 白名单过滤，如果用户不在白名单中，将会把API_RESPONSE和INFO两种等级的日志过滤掉。
    createWhitelistPipe(this),
    // 钩子beforeReport，ps: 只有 config 中的 beforeReport 能阻止上报
    (logs, resolve) => {
      try {
        const newLogs = JSON.parse(JSON.stringify(logs));
        this.lifeCycle.emit('beforeReport', newLogs);

        const { beforeReport } = this.config;
        if (typeof beforeReport === 'function') {
          logs = logs.filter((log: any) => beforeReport(log) !== false);
        }
        if (logs.length) {
          resolve(logs);
        }
      } catch (e) { }
    },
    // 上报
    reportPipe(this),
  ]);

  // TODO：测速管道，不应该放到这里，但为了修复ts类型问题，后续需要删掉
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public speedLogPipeline(_log?: SpeedLog | SpeedLog[] | BridgeLog | BridgeLog[]) {
    throw new Error('You need to override "speedLogPipeline" method');
  }

  // 自定义PV
  public reportPv(id: number) {
    if (!id) return;
    console.warn('reportPv is deprecated, please use reportEvent');

    const baseQuery = `${Object.getOwnPropertyNames(this.bean)
      .filter(key => key !== 'id')
      .map(key => `${key}=${this.bean[key]}`)
      .join('&')}`;

    this.sendPipeline([
      (_, resolve) => {
        resolve({
          url: `${this.config.url}/${id}?${baseQuery}`,
          // 不能拼接bean上去，否则bean里面的id会覆盖链接中的id
          addBean: false,
          type: SendType.CUSTOM_PV,
        });
      },
    ], SendType.CUSTOM_PV)(null);
  }

  public reportEvent(event: string | EventLog) {
    if (!event) return;
    // 参数兼容逻辑
    const eventParams = typeof event === 'string' ? {
      name: event,
      ext1: this.config.ext1 || '',
      ext2: this.config.ext2 || '',
      ext3: this.config.ext3 || '',
    } : event;
    if (!eventParams.name) {
      console.warn('reportEvent params error');
      return;
    }
    if (typeof eventParams.name !== 'string') {
      console.warn('reportEvent params name must be string');
      eventParams.name = String(eventParams.name);
    }
    this.eventPipeline(eventParams);
  }

  public eventPipeline = createPipeline([
    // 节流
    createThrottlePipe(this, 10),
    reportEventPipe(this),
  ]);

  // 自定义测速
  private timeMap: {
    [k: string]: number;
  } = {};

  // 上报失败次数
  private failRequestCount = 0;

  // 上报自定义测速
  public reportTime(key: string | ReportTimeLog, duration?: number) {
    if (typeof key === 'object') {
      return this.reportT(key);
    }
    if (typeof key !== 'string') {
      console.warn('reportTime: first param must be a string');
      return;
    }
    if (typeof duration !== 'number') {
      console.warn('reportTime: second param must be number');
      return;
    }
    if (duration < 0 || duration > 60000) {
      console.warn('reportTime: duration must between 0 and 60000');
      return;
    }
    this.submitCustomTime(key, duration);
  }

  // 上报自定义测速
  public reportT(obj: ReportTimeLog) {
    const { name, duration, ext1 = '', ext2 = '', ext3 = '', from = '' } = obj;
    if (typeof name !== 'string' || typeof duration !== 'number' || typeof ext1 !== 'string'
      || typeof ext2 !== 'string' || typeof ext3 !== 'string'
    ) {
      console.warn('reportTime: params error');
      return;
    }
    if (duration < 0 || duration > 60000) {
      console.warn('reportTime: duration must between 0 and 60000');
      return;
    }
    return this.submitCustomTime(name, duration, ext1, ext2, ext3, from);
  }

  public time(key: string) {
    if (typeof key !== 'string') {
      console.warn('time: first param must be a string');
      return;
    }
    if (!this.timeMap[key]) {
      this.timeMap[key] = Date.now();
    } else {
      console.warn(`Timer ${key} already exists`);
    }
  }
  public timeEnd(key: string) {
    if (typeof key !== 'string') {
      console.warn('timeEnd: first param must be a string');
      return;
    }
    if (this.timeMap[key]) {
      this.submitCustomTime(key, Date.now() - this.timeMap[key]);
      delete this.timeMap[key];
    } else {
      console.warn(`Timer ${key} does not exist`);
    }
  }
  private submitCustomTime(name: string, duration: number, ext1?: string, ext2?: string, ext3?: string, from?: string) {
    this.customTimePipeline({
      name,
      duration,
      ext1: ext1 || this.config.ext1,
      ext2: ext2 || this.config.ext2,
      ext3: ext3 || this.config.ext3,
      from: from || undefined,
    });
  }
  public customTimePipeline = createPipeline([
    // 节流 自定义测速因为数据量比较少，可以汇聚多一点
    createThrottlePipe(this, 10),
    reportCustomPipe(this),
  ]);
  // 扩展Bean数据
  public extendBean(key: string, value: any) {
    this.bean[key] = value;
  }
  // eslint-disable-next-line
  public sendPipeline(pipes: Pipe[], type: SendType) {
    return createPipeline([
      createRandomSamplePipe(this),
      beforeRequestHooks(this, type),
      ...pipes,
      modifyRequestHooks(this),
      (options: SendOption, next) => {
        // 支持当前管道获取异步resolve的结果
        this.request(
          options,
          (...args) => {
            this.failRequestCount = 0;
            next({ isErr: false, result: args, logType: options?.type, logs: options?.log });
            options?.success?.(...args);
          },
          (...args) => {
            // eslint-disable-next-line no-plusplus
            if (++this.failRequestCount >= MAX_FAIL_REQUEST_NUM) {
              this.destroy();
            }
            // 自动销毁逻辑
            const [error] = args;
            if (`${error}`.indexOf(FORBIDDEN_RESPONSE_DATA) > -1) {
              this.destroy();
            }

            next({ isErr: true, result: args, logType: options?.type, logs: options?.log });
            options?.fail?.(...args);
          }
        );
      },
      afterRequestHooks(this),
    ]);
  }
  // eslint-disable-next-line
  public send(options: SendOption, success?: SendSuccess, fail?: SendFail) {
    return createPipeline([
      modifyRequestHooks(this),
      (options: SendOption, next) => {
        // 支持当前管道获取异步resolve的结果
        this.request(
          options,
          (...args) => {
            next({ isErr: false, result: args, logType: options.type, logs: options.log });
            success?.(...args);
          },
          (...args) => {
            next({ isErr: true, result: args, logType: options.type, logs: options.log });
            fail?.(...args);
          }
        );
      },
      afterRequestHooks(this),
    ])(options);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public ready(_options: SendOption, _success?: SendSuccess, _fail?: SendFail) {
    throw new Error('You need to override "ready" method');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public request(_options: SendOption, _success?: SendSuccess, _fail?: SendFail) {
    throw new Error('You need to override "request" method');
  }

  // SDK 发生错误时上报方法
  public sendSDKError(err: any) {
    this.sendPipeline([
      (log, resolve) => {
        resolve({
          url: `${this.config.url}?id=1085&msg[0]=${encodeURIComponent(stringifyPlus(log))}&level[0]=2&from=${this.config.id}&count=1&version=${this.config.id}(${VERSION})`,
          addBean: false,
          method: 'get',
          type: SendType.SDK_ERROR,
          log,
        });
      }], SendType.SDK_ERROR)(err);
  }

  public destroy(force = false) {
    // 删除实例
    const instanceIndex = Core.instances.indexOf(this);
    if (instanceIndex !== -1) {
      Core.instances.splice(instanceIndex, 1);
    }
    // 删除插件中的实例
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = Core.installedPlugins.length - 1; i >= 0; i--) {
      try {
        const installedPlugin = Core.installedPlugins[i];
        installedPlugin.unpatch(this);
      } catch (e) {
        this.sendSDKError(e);
      }
    }

    this.lifeCycle.emit('destroy');
    this.lifeCycle.clear();

    if (force) {
      // 清空实例
      assignNullToObject(this);
      Object.setPrototypeOf(this, null);
    } else {
      // 用空方法替换实例方法 & 原型链上的方法
      // 如果直接替换原型链上的方法，会导致其它实例的方法也被影响
      // eslint-disable-next-line
      let objectForLoop = this;
      do {
        const constructorType = objectForLoop.constructor;
        if (constructorType !== Object) {
          assignEmptyFunctionToObject(objectForLoop, this);
        }
      } while (objectForLoop = Object.getPrototypeOf(objectForLoop));

      // 没有其它实例时，清空类静态方法
      if (Core.instances.length === 0) {
        const classObj = Object.getPrototypeOf(this).constructor;
        assignEmptyFunctionToObject(classObj);
        assignEmptyFunctionToObject(Core);
      }
    }
  }
}
