import './polyfill';
import Core from './core';
import Plugin from './plugin';

export { Plugin };

export default Core;
// interface
export {
  // 日志
  LogType,
  NormalLog,
  SpeedLog,
  BridgeLog,
  StaticAssetsLog,
  PagePerformanceLog,
  HippyPagePerformanceLog,
  // 配置
  Config,
  CoreApiConfig,
  // send方法参数类型
  SendOption,
  SendSuccess,
  SendFail,
  SendType,
  PlatTypeNum,
  NetworkTypeNum,
  PagePerformanceStruct,
} from './interface';

// 默认配置
export {
  getDefaultConfig,
  setConfigUrl,
  globalAny,
  REPORT_TIMEOUT,
  MAX_FROM_LENGTH,
  RESOURCE_TYPE,
  ERROR_MSG_IGNORE,
} from './constant';

export * from './pipes';
export * from './util';
