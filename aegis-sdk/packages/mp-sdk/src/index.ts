import Aegis from './aegis';

import { cgiSpeed, aid, onError, onAssetSpeed, onPagePerformance, onLoadPackage, onDevice } from './plugins';

// 错误收集
Aegis.use(onError);
// cgi测速
Aegis.use(cgiSpeed);
// aid
Aegis.use(aid);
Aegis.use(onAssetSpeed);
// 页面测速、页面PV
Aegis.use(onPagePerformance);
// 包加载耗时
Aegis.use(onLoadPackage);
// 平台、设备型号
Aegis.use(onDevice);

export default Aegis;
export { MpConfig } from './aegis';
// export { HackCloud } from './util/hack-cloud';
