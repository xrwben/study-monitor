import Core, {
  Plugin,
  StaticAssetsLog,
  formatUrl,
  shortUrl,
  urlIsHttps,
  getReportVal,
  Config,
  isIgnoreUrl,
} from 'aegis-core';
import { canUseResourceTiming } from '../util';

let plugin = new Plugin({ name: 'reportAssetSpeed' });

if (ASSET_SPEED) {
  plugin = new Plugin({
    name: 'reportAssetSpeed',
    collectCur: 0,
    collectEntryType: 'resource',
    ASSETS_INITIATOR_TYPE: ['img', 'css', 'script', 'link', 'audio', 'video'],
    onNewAegis(aegis: Core) {
      if (!canUseResourceTiming()) return;
      // 注册asset监听变化实例
      this.collectSuccessLog(aegis);
      // collect只执行一次，但每次collect到的数据都将分发至各个实例的管道中
      this.collectFailLog(aegis);
      // 满了就清零
      performance.onresourcetimingbufferfull = () => {
        this.collectCur = 0;
        performance.clearResourceTimings();
      };
    },
    // 分发日志
    publish(msg: StaticAssetsLog | StaticAssetsLog[], instance: Core) {
      this.$walk((aegis: Core) => {
        if (aegis !== instance) return;
        // @ts-ignore
        aegis.speedLogPipeline(msg);
      });
    },
    publishMany(entries: PerformanceEntry[], aegis: Core) {
      const { config } = aegis;
      for (let i = 0, l = entries.length; i < l; i++) {
        const entry = entries[i] as PerformanceResourceTiming;
        // 只收集静态资源 && 屏蔽aegis-sdk, offlineAuto, flog.core.min.js
        if (
          this.ASSETS_INITIATOR_TYPE.indexOf(entry.initiatorType) !== -1
          && !isIgnoreUrl(entry.name, config.hostUrl)
        ) {
          this.publish(this.generateLog(entry, config), aegis);
        }
      }
    },
    // 收集静态资源成功日志
    collectSuccessLog(aegis: Core) {
      if (typeof window.PerformanceObserver === 'function') {
        // 优先采用observer的方式监听
        // init先触发一次资源上报
        this.publishMany(performance.getEntriesByType(this.collectEntryType), aegis);
        const observer = new window.PerformanceObserver((list) => {
          this.publishMany(list.getEntries(), aegis);
        });
        observer.observe({ entryTypes: [this.collectEntryType] });
        aegis.lifeCycle.on('destroy', () => {
          if (plugin.countInstance() === 0) {
            observer.disconnect();
          }
        });
      } else {
        // fallback 定时器
        const intervalId = setInterval(() => {
          const allEntries = performance.getEntriesByType(this.collectEntryType);
          const collectEntries = allEntries.slice(this.collectCur); // allEntries里面进行到第几个, 用startTime对比now会不会更好？
          this.collectCur = allEntries.length;
          this.publishMany(collectEntries, aegis);
        }, 3000);
        aegis.lifeCycle.on('destroy', () => {
          if (plugin.countInstance() === 0) {
            clearInterval(intervalId); //
          }
        });
      }
    },
    // 收集静态资源失败日志
    collectFailLog(aegis: Core) {
      const { config } = aegis;

      const errorHandler = (event: Event) => {
        if (!event) return;
        const target = event.target || event.srcElement;
        const url = target?.src || target?.href;

        if (url && typeof url === 'string') {
          if (window.location.href.indexOf(url) > -1) {
            // 当src属性为空时，会触发资源加载异常，并且url为不包含hash的location.href。
            return;
          }

          const type = (typeof config.api?.resourceTypeHandler === 'function') ? config.api?.resourceTypeHandler(url) : '';
          // 将错误上报到资源测速
          // 202105fix：失败时仍然有duration
          const allEntries = performance.getEntriesByType(this.collectEntryType);
          const failedEntry = allEntries.find(item => item.name === url);
          if (isIgnoreUrl(url, config.hostUrl)) return;
          const failedLog: StaticAssetsLog = {
            url: shortUrl(url),
            status: 400,
            duration: Number((failedEntry?.duration || 0).toFixed(2)),
            method: 'get',
            type: type || 'static',
            isHttps: urlIsHttps(url),
            urlQuery: formatUrl(url, true),
            nextHopProtocol: '',
            domainLookup: 0,
            connectTime: 0,
          };
          this.publish(failedLog, aegis);
        }
      };
      window.document.addEventListener('error', errorHandler, true);
      aegis.lifeCycle.on('destroy', () => {
        if (plugin.countInstance() === 0) {
          window.document.removeEventListener('error', errorHandler, true);
        }
      });
    },
    // 格式化日志
    generateLog(entry: PerformanceResourceTiming, config: Config): StaticAssetsLog {
      const type = (typeof config.api?.resourceTypeHandler === 'function') ? config.api?.resourceTypeHandler(entry.name) : '';
      // 命中缓存transferSize为0
      // 跨域资源没有设置响应头Timing-Allow-Origin为0
      // 为0不上报，影响用户关心的数据（平均数，中位数等）
      const { transferSize } = entry;
      return {
        url: shortUrl(entry.name),
        method: 'get',
        duration: Number(entry.duration.toFixed(2)),
        status: 200, // resourceTiming 获取到的资源都是请求成功的
        type: type || 'static',
        isHttps: urlIsHttps(entry.name),
        nextHopProtocol: entry.nextHopProtocol || '',
        urlQuery: formatUrl(entry.name, true),
        domainLookup: getReportVal(entry.domainLookupEnd - entry.domainLookupStart) as number,
        connectTime: getReportVal(entry.connectEnd - entry.connectStart) as number,
        transferSize: transferSize > 0 ? transferSize : -1,
      };
    },
    collectNotReportedLog(aegis: Core) {
      if (!canUseResourceTiming()) return;
      const allEntries = performance.getEntriesByType(this.collectEntryType);
      const len = allEntries.length;
      if (typeof window.PerformanceObserver === 'function' || this.collectCur === len) {
        return;
      }

      const collectEntries = allEntries.slice(this.collectCur);
      this.collectCur = len;
      this.publishMany(collectEntries, aegis, true);
    },
    destroy() {
      this.option.publish = function () { };
    },
  });
}

export default plugin;
