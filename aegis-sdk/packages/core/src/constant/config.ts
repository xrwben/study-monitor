import { Config } from '../interface';

const defaultHostUrl = 'https://aegis.qq.com';
// 默认超时设置
export const REPORT_TIMEOUT = 5000;

// 最大失败次数，超过该次数后就主动熔断
export const MAX_FAIL_REQUEST_NUM = 60;

// 最大日志长度，超过该长度后日志主动截断
export const MAX_LOG_LENGTH = 100 * 1024;

// 最大页面地址长度，超过该长度后 from 主动截断
export const MAX_FROM_LENGTH = 2 * 1024;

// 可以匹配 t=123 _t=123 t1=123 t2=123 timestamp=123
export const TIMESTAMP_REG = /_?t(\d)?(imestamp)?=\d+&?/g;

// 相同的接口，相同的错误，每分钟最多上报的次数
export const MAX_REPEAT_TIMES = 60;

// 清除重复错误，重复接口的间隔
export const CLEAR_REPEAT_CACHE_TIMEOUT = 60000;

// 服务端返回禁止上报时的 response data
export const FORBIDDEN_RESPONSE_DATA = '403 forbidden';

export const getDefaultConfig = (): Config => ({
  version: 0,
  delay: 1000,
  onError: true,
  repeat: MAX_REPEAT_TIMES,
  random: 1,
  aid: true,
  device: true,
  pagePerformance: true,
  webVitals: true,
  speedSample: true,
  onClose: true,
  reportLoadPackageSpeed: true,
  hostUrl: defaultHostUrl,
  env: 'production',
  url: '',
  offlineUrl: '',
  whiteListUrl: '',
  pvUrl: '',
  speedUrl: '',
  customTimeUrl: '',
  performanceUrl: '',
  webVitalsUrl: '',
  eventUrl: '',
  setDataReportUrl: '',
  reportImmediately: true,
});

export const setConfigUrl = (config: Config, hostUrl = defaultHostUrl): Config => {
  config.url = config.url || `${hostUrl}/collect`;
  config.offlineUrl = config.offlineUrl || `${hostUrl}/offline`;
  config.whiteListUrl = config.whiteListUrl || `${hostUrl}/collect/whitelist`; // 仅白名单接口
  config.pvUrl = config.pvUrl || `${hostUrl}/collect/pv`; // 上报pv的接口
  config.eventUrl = config.eventUrl || `${hostUrl}/collect/events`;
  config.speedUrl = config.speedUrl || `${hostUrl}/speed`;
  config.customTimeUrl = config.customTimeUrl || `${hostUrl}/speed/custom`;
  config.performanceUrl = config.performanceUrl || `${hostUrl}/speed/performance`;
  config.webVitalsUrl = config.webVitalsUrl || `${hostUrl}/speed/webvitals`;
  config.setDataReportUrl = config.SetDataReportUrl || `${hostUrl}/speed/miniProgramData`;
  return config;
};
