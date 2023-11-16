export {
  getDefaultConfig,
  setConfigUrl,
  REPORT_TIMEOUT,
  MAX_FAIL_REQUEST_NUM,
  MAX_LOG_LENGTH,
  MAX_FROM_LENGTH,
  MAX_REPEAT_TIMES,
  CLEAR_REPEAT_CACHE_TIMEOUT,
  FORBIDDEN_RESPONSE_DATA,
  TIMESTAMP_REG,
} from './config';
export {
  URL_SPEED_IGNORE,
  ERROR_MSG_IGNORE,
} from './report-ignore';
export const COMPLETION_KEYS = ['ext1', 'ext2', 'ext3', 'level', 'trace', 'tag', 'seq', 'code'];
export const RESOURCE_TYPE = ['static', 'fetch'];
export * from './global';
