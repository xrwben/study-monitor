import Core, { Plugin, generateAid } from 'aegis-core';

export default new Plugin({
  name: 'aid',
  onNewAegis(aegis: Core) {
    // 将获取到的aid挂载到bean上
    // 实例每次send时都会把bean拼接到query中
    // hippy 执行机制，setTimeout在bridge创建之后，避免获取不到localstorage实例
    if (this.aid && this.aid !== true) {
      aegis.bean.aid = this.aid;
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
  async getAid(callback: Function) {
    // 某些情况下操作 localStorage 会报错.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const storage = require('@system.storage');
      storage.get({
        key: 'AEGIS_ID',
        success(aid: string) {
          if (!aid) {
            aid = generateAid();
            storage.set({
              key: 'AEGIS_ID',
              value: aid,
            });
          }
          callback?.(aid || '');
        },
        fail() {
          callback?.('');
        },
      });
    } catch (e) {
      callback?.('');
    }
  },
});
