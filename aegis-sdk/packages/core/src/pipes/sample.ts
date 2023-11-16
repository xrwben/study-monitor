import { Pipe } from './index';
import Core from '../core';


// 随机--抽样丢弃
export const createRandomSamplePipe =  (aegis: Core): Pipe =>  (msg, resolve) => {
  if (typeof aegis.config.random !== 'number') {
    console.warn('random must in [0, 1], default is 1.');
    aegis.config.random = 1;
  }
  if (aegis.isHidden && aegis.isGetSample) return;
  if (!aegis.isGetSample) {
    aegis.isGetSample = true;
    if (Math.random() < aegis.config.random) {
      aegis.isHidden = false;
      return resolve(msg);
    }
    aegis.isHidden = true;
  } else {
    !aegis.isHidden && resolve(msg);
  }
};
