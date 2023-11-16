import { Plugin, generateAid } from 'aegis-core';
import { env } from '../adaptor';

const AEGIS_ID_KEY = 'AEGIS_ID';

export default new Plugin({
  name: 'aid',

  onNewAegis(aegis) {
    this.initAid((aid: string) => {
      aegis.bean.aid = aid;
      aegis.config.aid = aid;
    });
  },

  initAid(callback: (aid: string) => any) {
    env.getStorage({
      key: AEGIS_ID_KEY,
      success: (res) => {
        callback(res.data);
      },
      fail: () => {
        const aid = generateAid();
        env.setStorage({
          key: AEGIS_ID_KEY,
          data: aid,
          success: () => {
            callback(aid);
          },
        });
      },
    });
  },
});
