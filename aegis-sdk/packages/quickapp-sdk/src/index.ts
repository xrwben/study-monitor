import Aegis from './aegis';

import {
  cgiSpeed,
  aid,
  device,
} from './plugins';

// device
Aegis.use(device);
// cgi测速
Aegis.use(cgiSpeed);
// aid
Aegis.use(aid);

export default Aegis;
