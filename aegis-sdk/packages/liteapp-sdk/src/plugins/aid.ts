import { Plugin, generateAid } from 'aegis-core';
import { AEGIS_ID_KEY } from '../constant';
import { setKvItem, getKvItem, isPageRuntime } from '../util';


export default new Plugin({
  name: 'aid',

  onNewAegis(aegis) {
    if (aegis.config.useStore && isPageRuntime()) {
      // 有使用了Store的页面线程，不执行
      return;
    }
    this.initAid((aid: string) => {
      aegis.bean.aid = aid;
      aegis.config.aid = aid;
    });
  },

  initAid(callback: (aid: string) => any) {
    getKvItem(AEGIS_ID_KEY)
      .then((aid) => {
        if (!aid) {
          aid = generateAid();
          setKvItem(AEGIS_ID_KEY, aid); // 默认90天超时销毁
        }
        callback(aid);
      })
      .catch(() => {
        callback('');
      });
  },
});
