import Aegis from './aegis';
import { onError, cgiSpeed, onDevice, aid } from './plugins';

import { UseStore } from './util';

Aegis.use(onError);

Aegis.use(cgiSpeed);

Aegis.use(onDevice);

Aegis.use(aid);

export default Aegis;


export { UseStore };
