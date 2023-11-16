import { Pipe, reportPipe } from './index';
import Core from '../core';
import { LogType, NormalLog, SendType } from '../interface';
/**
 * 格式化日志
 * @param log 日志
 */
const formatLog =  (log: NormalLog) => {
  // 如修正INFO_ALL类型为INFO类型（后端并不能识别INFO_ALL类型）
  log.level === LogType.INFO_ALL && (log.level = LogType.INFO);
};

export const createWhitelistPipe =  (aegis: Core): Pipe => {
  let isWhiteList = false;
  let requestEnd = false;

  // 请求白名单接口
  // 这个 “setTimeout” 存在是因为 “createWhitelistPipe” 被执行时子类的 “send” 方法还没覆盖 “Core” 的 “send” 占位
  // 晚点执行请求也有好处，防止业务方说 Aegis 请求阻塞他们的重要请求
  // 接收到config变化后再执行，初始化会触发一次，每次setConfig也会触发
  let timer: number;
  let sendWhitelist = false;
  // 不确定是否是白名单时暂存的数据
  // TODO 这里有一个坑，存在 pool 里的数据，如果后续没有日志上报，pool 将不会被报上去。。
  // re：添加白名单成功请求时上报pool,不确定还有没有其他场景出现pool没有上报的情况
  const pool: NormalLog[] = [];

  aegis.lifeCycle.on('onConfigChange', () => {
    timer && clearTimeout(timer);
    timer = setTimeout(() => {
      if (sendWhitelist || !aegis.config) {
        return;
      }
      sendWhitelist = true;
      const { whiteListUrl = '' } = aegis.config;
      whiteListUrl && aegis.sendPipeline([
        (_, resolve) => {
          resolve({
            url: whiteListUrl,
            type: SendType.WHITE_LIST,
            success: (res: any) => {
              requestEnd = true;
              try {
                const data = res.data ? res.data : JSON.parse(res);
                const { retcode, result = {} } =  data;
                if (retcode === 0) {
                  isWhiteList = result.is_in_white_list;
                  aegis.isWhiteList = isWhiteList;
                  if (result.rate >= 0 && result.rate <= 1) {
                    aegis.config.random = result.rate;
                    // 重新获取一次是否被抽样
                    aegis.isGetSample = false;
                  }
                }
                // 如果有缓存的日志，并且是白名单用户，则上报数据
                if (aegis.isWhiteList && pool.length) {
                  reportPipe(aegis)(pool.splice(0), () => {});
                } else if (!aegis.isWhiteList && pool.length) {
                  pool.length = 0;
                }

                const { onWhitelist } = aegis.config;
                if (typeof onWhitelist === 'function') {
                  onWhitelist(isWhiteList);
                }
              } catch (e) {
              }
            },
            fail: () => {
              requestEnd = true;
            },
          });
        },
      ], SendType.WHITE_LIST)(null);
      // 修复用户中途换号登录，不会请求白名单了bug
      sendWhitelist = false;
    }, aegis.config.uin ? 50 : 500) as unknown as number;
  });

  aegis.lifeCycle.on('destroy', () => {
    pool.length = 0;
  });
  // aegis/issue/issues/218
  // let errorHappened = false;

  return  (logs: NormalLog[], resolve) => {
    // 检查是否有ERROR级别的错误日志
    // if (!errorHappened && logs.some(log => log.level === LogType.ERROR)) {
    //   errorHappened = true;
    // }

    // 在白名单中 || 本次实例中出现过一次ERROR级别的日志，就把所有日志上报
    if (isWhiteList || aegis.config?.api?.reportRequest) {
      // 白名单，清空并带上pool中的日志
      resolve(logs.concat(pool.splice(0)).map((log) => {
        formatLog(log);
        return log;
      }));
    } else {
      // 非白名单或者白名单请求还未结束
      const otherLog = logs.filter((log) => {
        if (
          log.level !== LogType.INFO && log.level !== LogType.API_RESPONSE
        ) {
          formatLog(log);
          // 除了INFO类型和API_RESPONSE类型需要判断白名单外，其他日志类型都直接上报
          return true;
        }

        if (!requestEnd) {
          // 白名单请求还没结束
          pool.push(log);
          pool.length >= 200 && (pool.length = 200);
        }
        return false;
      });

      // 必须判断长度，不然后面的 pipe 会空跑
      otherLog.length && resolve(otherLog);
    }
  };
};
