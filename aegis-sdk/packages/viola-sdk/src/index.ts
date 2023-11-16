import Aegis from './aegis';

import { onError, aid, cgiSpeed } from './plugins';

// 错误收集
Aegis.use(onError);
// aid
Aegis.use(aid);
// cgi 测速
Aegis.use(cgiSpeed);

export default Aegis;
export { ViolaConfig } from './aegis';
