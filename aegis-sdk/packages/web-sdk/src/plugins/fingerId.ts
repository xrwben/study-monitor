/* eslint-disable no-plusplus */
/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable no-restricted-syntax */
/* eslint-disable prefer-destructuring */
import { Plugin, generateAid } from 'aegis-core';
import {
  getComplicateFingerprint,
  getBasicFingerprint,
} from '../util/finger';
import { hashTo32 } from '../util/crypto';

let plugin = new Plugin({ name: 'aid' });
if (FINGER_ID) {
  const getFormattedFinger = (rawFinger: string) => {
    let i = 0;
    const formattedFingerAid = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      .split('')
      .map(c => (c === 'x' ? rawFinger[i++] : c))
      .join('');
    return formattedFingerAid;
  };

  /**
    * @description
    * 指纹生成入口方法
    *   指纹算法:canvas finger + font finger算法
    *   定长映射算法:murmurHash哈希算法
    */
  const generateAidByFingerprint = function () {
    const complicateFinger = getComplicateFingerprint();
    const basicFinger = getBasicFingerprint();

    const fingerStr = basicFinger + complicateFinger;
    const hashedFinger = hashTo32(fingerStr);
    return getFormattedFinger(hashedFinger);
  };

  plugin = new Plugin({
    name: 'aid',
    aid: '',
    init(AID) {
      // 某些情况下操作 localStorage 会报错.
      try {
        let aid = (AID !== true && AID);
        if (!aid) {
          aid = generateAidByFingerprint() || generateAid();
        }
        this.aid = aid;
      } catch (e) { }
    },
    onNewAegis(aegis) {
      aegis.bean.aid = this.aid;
      aegis.config.aid = this.aid;
    },
  });
}
export default plugin;
