import Aegis from './aegis';

import { cgiSpeed, onError, aid, device, bridgeSpeed } from './plugins';

// 错误收集
Aegis.use(onError);
// cgi测速
Aegis.use(cgiSpeed);
// aid
Aegis.use(aid);
// bridge测速
Aegis.use(bridgeSpeed);
// device
Aegis.use(device);

export default Aegis;
export { HippyConfig } from './aegis';
