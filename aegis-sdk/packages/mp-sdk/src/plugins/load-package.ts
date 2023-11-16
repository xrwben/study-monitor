import Core, {
  Plugin,
  SendType,
} from 'aegis-core';
import { env } from '../adaptor';

interface LoadPackageItem {
  duration: number;
  packageName: string;
  name: string;
  entryType: string;
  packageSize: number;
  startTime: number;
}

export default new Plugin({
  name: 'reportLoadPackageSpeed',
  isLoaded: false,

  onNewAegis(aegis) {
    if (this.isLoaded) return;
    this.isLoaded = true;
    this.start(aegis);
  },

  start() {
    if (!env.getPerformance) return;
    const performance: WechatMiniprogram.Performance = env.getPerformance();
    const observer = performance.createObserver((entryList: WechatMiniprogram.Performance) => {
      const resourceList = entryList.getEntries();
      resourceList?.forEach((item) => {
        if (typeof item.duration !== 'number' || item.duration <= 0) return;
        this.publishPackageLog(item);
      });
    });
    observer.observe({ entryTypes: ['loadPackage'] });
  },

  generateLog(item: LoadPackageItem) {
    return [{
      type: SendType.LOAD_PACKAGE,
      packageName: item.packageName,
      size: Math.round(item.packageSize * 100) / 100,
      duration: Math.round(item.duration * 100) / 100,
    }];
  },

  publishPackageLog(item: LoadPackageItem) {
    this.$walk((aegis: Core) => {
      const formatLogs = this.generateLog(item);
      aegis.send({
        url: `${aegis.config.setDataReportUrl}?payload=${encodeURIComponent(JSON.stringify({ miniProgramData: formatLogs }))}`,
        type: SendType.LOAD_PACKAGE,
        log: formatLogs,
      });
    });
  },
});
