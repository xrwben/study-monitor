import Core, { Plugin, generateAid } from 'aegis-core';

interface RnCore extends Core {
  getAsyncStorage: Function;
}
export default new Plugin({
  name: 'aid',
  init() {},
  onNewAegis(aegis: Core) {
    this.getAid(aegis).then((aid: string) => {
      // 将获取到的aid挂载到bean上
      // 实例每次send时都会把bean拼接到query中
      aegis.bean.aid = aid;
      aegis.config.aid = aid;
    });
  },
  async getAid(aegis: RnCore) {
    const storageKey = 'AEGIS_ID';
    const asyncStorage = aegis.getAsyncStorage(); // 从rn-sdk里取的
    try {
      let aid: string = await asyncStorage.getItem(storageKey);
      if (!aid) {
        aid = generateAid();
        asyncStorage.setItem(storageKey, aid);
      }

      return aid || '';
    } catch (e) {
      return '';
    }
  },
});
