import { BridgeLog, SpeedLog, stringify, ERROR_MSG_IGNORE } from 'aegis-core';

/**
 * 过滤log
 * @param {Any} log 要发送单个log对象
 * @return {Any} 过滤后的log对象
 */
const filteLog = function (log: any): any {
  if (log.payload) {
    const filterLog: any = {};
    // 使用复制的形式而使用delete的原因是为了用户在控制台打印log时可以看到此属性
    Object.keys(log).forEach((key: string) => {
      if (key !== 'payload') {
        filterLog[key] = log[key];
      }
    });
    return filterLog;
  }
  return log;
};

export const speedShim = function (logs: SpeedLog | SpeedLog[] | BridgeLog | BridgeLog[], bean: any) {
  const result = {
    fetch: [] as SpeedLog[],
    static: [] as SpeedLog[],
    bridge: [] as BridgeLog[],
  };
  const formData = new FormData();

  if (Array.isArray(logs)) {
    logs.forEach((log: SpeedLog | BridgeLog) => {
      const filterLog = filteLog(log);
      result[log.type].push(filterLog);
    });
  } else {
    const filterLog = filteLog(logs);
    result[logs.type].push(filterLog);
  }
  // 拼接bean;
  formData.append(
    'payload',
    stringify({
      duration: result,
      ...bean,
    }),
  );
  return formData;
};

export const loadScript = function (url: string, name?: string, cb?: Function) {
  const s: any = document.createElement('script');
  const { head } = document;
  if (typeof name === 'function') {
    cb = name;
    name = '';
  }
  s.src = url;
  s.setAttribute('name', name);
  s.name = name;
  s.setAttribute('crossorigin', 'anonymous');
  s.crossorigin = 'anonymous'; // 部分浏览器会存在问题,设置不上
  s.defer = true;
  s.hasLoaded = false; // 避免onreadystatechange被多次执行
  s.onreadystatechange = function () {
    if (s.hasLoaded) return; // 已经执行过一次就不用再执行了，主要是避免ie执行两次问题
    if (!s.readyState || s.readyState === 'loaded' || s.readyState === 'complete') {
      s.hasLoaded = true;
      typeof cb === 'function' && cb(false);
      setTimeout(() => {
        head.contains(s) && head.removeChild(s);
      });
    }
  };
  s.onload = s.onreadystatechange;

  s.onerror = function () {
    // 执行插件
    typeof cb === 'function' && cb(true);
    setTimeout(() => {
      head.contains(s) && head.removeChild(s);
    });
  };
  if (document.readyState === 'complete') {
    head.appendChild(s);
  } else {
    window.addEventListener('load', () => {
      head.appendChild(s);
    });
  }
};

// 需要屏蔽的错误日志
export const isIgnoreErrorMsg = function (errorMsg: string): boolean {
  return typeof errorMsg !== 'string'
    || !errorMsg
    || ERROR_MSG_IGNORE.some(item => errorMsg.indexOf(item) > -1);
};

// 判断是否能使用performance
export const canUseResourceTiming = function (): boolean {
  return (
    typeof window.performance !== 'undefined'
    // && isNative(window.Performance)
    && typeof performance.clearResourceTimings === 'function'
    && typeof performance.getEntriesByType === 'function'
    && typeof performance.now === 'function'
  );
};

// 判断是否可以使用 web-vitals
export const canUseWebVitals = function (): boolean {
  return (
    typeof window.PerformanceObserver === 'function'
    && typeof performance.getEntriesByName === 'function'
  );
};

// 监听页面关闭
export type OnHiddenCallback = (event: Event) => void;

export const onHidden = (cb: OnHiddenCallback, once?: boolean) => {
  const onHiddenOrPageHide = (event: Event) => {
    if (event.type === 'pagehide' || document.visibilityState === 'hidden') {
      cb(event);
      if (once) {
        removeEventListener('visibilitychange', onHiddenOrPageHide, true);
        removeEventListener('pagehide', onHiddenOrPageHide, true);
      }
    }
  };
  addEventListener('visibilitychange', onHiddenOrPageHide, true);
  // Some browsers have buggy implementations of visibilitychange,
  // so we use pagehide in addition, just to be safe.
  addEventListener('pagehide', onHiddenOrPageHide, true);
};
