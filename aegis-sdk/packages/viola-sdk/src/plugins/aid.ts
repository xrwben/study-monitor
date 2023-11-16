/* eslint-disable no-param-reassign */
import { Plugin, generateAid } from 'aegis-core';

export default new Plugin({
  name: 'aid',
  onNewAegis(aegis) {
    // 将获取到的aid挂载到bean上
    // 实例每次send时都会把bean拼接到query中
    if (this.aid && this.aid !== true) {
      aegis.bean.aid = this.aid;
      aegis.config.aid = this.aid;
    } else {
      const timer = setTimeout(() => {
        this.getAid((aid: string) => {
          this.aid = aid;
          aegis.bean.aid = this.aid;
          aegis.config.aid = this.aid;
        });
        clearTimeout(timer);
      }, 0);
    }
  },
  getAid(callback: Function) {
    const cache = viola.requireAPI('cache');
    cache.getItem('AEGIS_ID', (aid: string) => {
      if (aid === '{}' || JSON.stringify(aid) === '{}') {
        aid = generateAid();
        cache.setItem('AEGIS_ID', aid);
      }
      callback?.(aid || '');
    });
  },
});
