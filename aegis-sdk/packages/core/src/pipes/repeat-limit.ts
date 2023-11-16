import { Pipe } from './index';
import { SpeedLog, NormalLog, LogType, Config } from '../interface';
import { MAX_REPEAT_TIMES, CLEAR_REPEAT_CACHE_TIMEOUT } from '../constant';

const timerMaps: { [key: string]: any } = {};
const logMaps: { [key: string]: { [key: string]: (number) } } = {};

// 定时清除缓存中的数据
const buildAutoClearTimer = function (id: string) {
  if (!timerMaps[id]) {
    timerMaps[id] = setTimeout(() => {
      logMaps[id] = {};
      timerMaps[id] = null;
    }, CLEAR_REPEAT_CACHE_TIMEOUT);
  }
  return timerMaps[id];
};

// 限制每条测速只上报 MAX_REPEAT_TIMES 次，可以通过 repeat 参数进行修改，如果传入 repeat 参数为 0，则不限制
export const createSpeedRepeatLimitPipe = (config: Config): Pipe => (log: SpeedLog | SpeedLog[], resolve) => {
  const maxNum = typeof config.repeat === 'number' ? config.repeat : MAX_REPEAT_TIMES;
  if (!config.speedSample || maxNum <= 0) {
    resolve(log);
    return;
  }
  const mapId = config?.id || '0';
  const logMap = logMaps[mapId] || {};
  if (Array.isArray(log)) {
    const filterLog = log.filter((log) => {
      const through = !logMap[log.url] || logMap[log.url] < maxNum;
      if (through) {
        logMap[log.url] = ~~logMap[log.url] + 1;
        logMaps[mapId] = logMap;
      } else if (!timerMaps[mapId]) {
        buildAutoClearTimer(mapId);
      }

      return through;
    });
    filterLog.length && resolve(filterLog);
  } else {
    if (!logMap[log.url] || logMap[log.url] < maxNum) {
      logMap[log.url] = ~~logMap[log.url] + 1;
      logMaps[mapId] = logMap;
      resolve(log);
    } else if (!timerMaps[mapId]) {
      buildAutoClearTimer(mapId);
    }
  }
};

// 限制相同的错误只上报 MAX_REPEAT_TIMES 次，可以通过 repeat 参数进行修改，如果传入 repeat 参数为 0，则不限制
export const createErrorLogLimitPipe = (config: Config): Pipe => (logs: NormalLog[], resolve) => {
  const maxNum = typeof config.repeat === 'number' ? config.repeat : MAX_REPEAT_TIMES;
  if (maxNum <= 0) {
    return resolve(logs);
  }

  const mapId = `${config?.id}_error`;
  const logMap = logMaps[mapId] || {};
  resolve(logs.filter((log) => {
    // 数量限制只针对错误日志
    if (
      log.level === LogType.ERROR
      || log.level === LogType.PROMISE_ERROR
      || log.level === LogType.AJAX_ERROR
      || log.level === LogType.SCRIPT_ERROR
      || log.level === LogType.IMAGE_ERROR
      || log.level === LogType.CSS_ERROR
      || log.level === LogType.MEDIA_ERROR
      || log.level === LogType.RET_ERROR
      || log.level === LogType.BRIDGE_ERROR
      || log.level === LogType.PAGE_NOT_FOUND_ERROR
      || log.level === LogType.WEBSOCKET_ERROR
      || log.level === LogType.LAZY_LOAD_ERROR
    ) {
      const logKey = log.msg.slice(0, 200);
      // 如果超过 maxNum 就不上报
      if (logMap[logKey] > maxNum) {
        if (!timerMaps[mapId]) {
          buildAutoClearTimer(mapId);
        }
        return false;
      }

      logMap[logKey] = ~~logMap[logKey] + 1;
      logMaps[mapId] = logMap;
    }
    return true;
  }));
};
