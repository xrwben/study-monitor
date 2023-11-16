import Core, { Plugin, NormalLog } from 'aegis-core';

import Aegis from '../aegis';

let plugin = new Plugin({ name: 'performanceMonitor' });

// 默认fps
const DEFAULT_FPS = 60;
// fps队列
let fpsList = [] as Array<number>;
// 调用次数统计
let count = 0;
// 上次调用时间
let lastTime = performance.now();
// 上报时间间隔, 默认60s
let reportInterval = 60;

plugin = new Plugin({
  name: 'performanceMonitor',
  onNewAegis(aegis: Aegis) {
    const { config: { fpsReportInterval = true } } = aegis;
    if (!fpsReportInterval) {
      return;
    }

    reportInterval = typeof fpsReportInterval === 'number' ? fpsReportInterval : reportInterval;

    cc.director.on(cc.Director.EVENT_AFTER_DRAW, this.afterDraw, this);
    this.reportFps(aegis);
  },
  // 渲染后回调
  afterDraw() {
    count += 1;
    const curTime = performance.now();
    if (curTime - lastTime > 1000) {
      // 最多保存60个，防止这个时间设置太大，导致队列过大
      if (fpsList.length > 60) {
        fpsList = [];
      }

      fpsList.push(count);
      count = 0;
      lastTime = curTime;
    }
  },
  // 获取drawcall次数
  getDrawCall() {
    return cc.renderer.drawCalls;
  },
  // 上报fps
  reportFps(aegis: Aegis) {
    setInterval(() => {
      const avgFps = this.getAvgFps();
      fpsList = [];
      aegis.reportTime({
        name: 'fps',
        duration: avgFps,
        ext1: avgFps.toString(),
      });
      aegis.reportTime({
        name: 'drawcall',
        duration: this.getDrawCall(),
        ext1: this.getDrawCall().toString(),
      });
    }, reportInterval * 1000);
  },
  // 获取平均fps大小
  // =这里用工具函数就好了
  getAvgFps() {
    const len = fpsList.length;
    if (len === 0) {
      return DEFAULT_FPS;
    }

    return fpsList.reduce((sum: number, val: number) => sum + val, 0) / len;
  },
  // 上报
  report(msg: NormalLog | NormalLog[]) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(msg);
    });
  },
  // 销毁
  destroy() {
    cc.director.off(cc.Director.EVENT_AFTER_DRAW, this.afterDraw, this);
  },
});

export default plugin;
