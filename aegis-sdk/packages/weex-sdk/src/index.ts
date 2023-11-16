import Aegis from './aegis';

import {
  cgiSpeed,
  onError,
  aid,
} from './plugins';

// 错误收集
Aegis.use(onError);
// cgi测速
Aegis.use(cgiSpeed);
// aid
Aegis.use(aid);

export default Aegis;
export { WeexConfig } from './aegis';
