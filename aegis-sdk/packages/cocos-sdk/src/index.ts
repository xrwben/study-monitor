import {
  cgiSpeed,
  assetSpeed,
  onError,
  aid,
  performanceMonitor,
  spa,
  device,
} from './plugins';
import Aegis from './aegis';

// 错误收集
if (ON_ERROR) {
  Aegis.use(onError);
}
// cgi测速
if (CGI_SPEED) {
  Aegis.use(cgiSpeed);
}
// 静态资源收集
if (ASSET_SPEED) {
  Aegis.use(assetSpeed);
}
// 性能监控
Aegis.use(performanceMonitor);
// aid
Aegis.use(aid);
// 设备信息
Aegis.use(device);
// 场景切换
if (SPA) {
  Aegis.use(spa);
}
export default Aegis;
export { CocosConfig } from './aegis';
