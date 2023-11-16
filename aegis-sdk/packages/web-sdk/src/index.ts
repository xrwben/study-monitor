import './util/polyfill';
import {
  onError,
  assetSpeed,
  pagePerformance,
  webVitals,
  cgiSpeed,
  bridgeSpeed,
  aid,
  fingerId,
  // tjg,
  device,
  offlineLog,
  spa,
  ie,
  onClose,
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
// 页面性能
if (PAGE_PERFORMANCE) {
  Aegis.use(pagePerformance);
}
// web vitals
if (WEB_VITALS && !IS_IE) {
  Aegis.use(webVitals);
}
// aid
if (FINGER_ID) {
  Aegis.use(fingerId);
} else {
  Aegis.use(aid);
}
// 天机阁全链路日志.
// if (TJG) {
//   Aegis.use(tjg);
// }
// 设备信息
Aegis.use(device);
// 离线日志
if (OFFLINE_LOG) {
  Aegis.use(offlineLog);
}
// 单页应用
if (SPA) {
  Aegis.use(spa);
}
// ie补丁
if (IS_IE) {
  Aegis.use(ie);
}

if (ON_CLOSE) {
  Aegis.use(onClose);
}

Aegis.use(bridgeSpeed);

export default Aegis;
export { WebConfig } from './aegis';
