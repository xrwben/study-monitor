import Core, { Plugin, generateAid } from 'aegis-core';

export default new Plugin({
  name: 'aid',
  onNewAegis(aegis: Core) {
    // 将获取到的aid挂载到bean上
    // 实例每次send时都会把bean拼接到query中
    // hippy 执行机制，setTimeout在bridge创建之后，避免获取不到localstorage实例
    if (this.aid && this.aid !== true) {
      aegis.bean.aid = this.aid;
      aegis.config.aid = this.aid;
    } else {
      (async () => {
        this.aid = await this.getAid();
        if (aegis.config.aid !== true) {
          // hippy有一个问题，首先用户在初始化aegis的时候往往拿不到uin写aid（hippy需要在$start之后才能拿到注入的登录态），需要通过setConfig传入
          // 由于getAid要读取storage，而hippy的storage是异步的，因此会出现用户setConfig的值被getAid覆盖掉的情况
          // 如果用户已经传入了aid，这里就不让覆盖了
          return;
        }
        aegis.bean.aid = this.aid;
        aegis.config.aid = this.aid;
      })();
    }
  },
  async getAid() {
    // 某些情况下操作 localStorage 会报错.
    try {
      let aid = await localStorage.getItem('AEGIS_ID');
      if (!aid) {
        aid = generateAid();
        localStorage.setItem('AEGIS_ID', aid);
      }
      return aid;
    } catch (e) {
      return '';
    }
  },
});
