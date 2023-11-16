import Core, {
  Plugin,
  formatUrl,
  shortUrl,
  StaticAssetsLog,
  isIgnoreUrl,
} from 'aegis-core';
import { env } from '../adaptor';

interface EntryObj {
  domainLookupEnd: number;
  domainLookupStart: number;
  duration: number;
  entryType: string;
  initiatorType: string;
  name: string;
  startTime: number;
  transferSize: number;
  uri: string;
}
// interface EntryList {
//   [index: number]: EntryObj;
//   getEntries: Function;
// }
export default new Plugin({
  name: 'reportAssetSpeed',

  isStart: false,

  onNewAegis(aegis) {
    if (this.isStart) return;
    this.isStart = true;
    this.start(aegis);
  },

  // 改写fetch
  start(aegis: Core) {
    if (!env.getPerformance) return;
    const performance = env.getPerformance() as any;
    const observer = performance.createObserver((entryList: WechatMiniprogram.Performance) => {
      const resourceList = entryList.getEntries();
      resourceList?.forEach((item) => {
        if (isIgnoreUrl(item.uri, aegis.config.hostUrl)
          || typeof item.duration !== 'number'
          || item.duration <= 0) return;
        this.publishAssetLog(item);
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  },

  generateLog(item: EntryObj): StaticAssetsLog {
    // 命中缓存transferSize为0
    // 跨域资源没有设置响应头Timing-Allow-O rigin为0
    // 为0不上报，影响用户关心的数据（平均数，中位数等）
    const { transferSize } = item;
    return {
      url: shortUrl(item.uri),
      method: 'get',
      duration: Math.round(item.duration * 100) / 100,
      status: 200 as number, // resourceTiming 获取到的资源都是请求成功的
      type: 'static',
      isHttps: true,
      urlQuery: formatUrl(item.uri, true),
      nextHopProtocol: '',
      domainLookup: 0,
      connectTime: 0,
      transferSize: transferSize > 0 ? transferSize : -1,
    };
  },

  publishAssetLog(item: EntryObj) {
    this.$walk((aegis: Core) => {
      aegis.speedLogPipeline(this.generateLog(item));
    });
  },
});
