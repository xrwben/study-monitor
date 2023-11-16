import Aegis from './aegis';

import { aid, onError, cgiSpeed, device } from './plugins';

// 错误收集
Aegis.use(onError);
// aid
Aegis.use(aid);
// cgi测速
Aegis.use(cgiSpeed);
// 硬件信息
Aegis.use(device);

export default Aegis;
export { RNConfig } from './aegis';
