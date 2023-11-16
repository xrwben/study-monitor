import { Plugin, generateAid } from 'aegis-core';

export default new Plugin({
  name: 'aid',
  aid: '',
  init(AID) {
    // 某些情况下操作 localStorage 会报错.
    try {
      let aid = (AID !== true && AID) || cc.sys.localStorage.getItem('AEGIS_ID');
      if (!aid) {
        aid = generateAid();
        cc.sys.localStorage.setItem('AEGIS_ID', aid);
      }
      this.aid = aid;
    } catch (e) {}
  },
  onNewAegis(aegis) {
    aegis.bean.aid = this.aid;
    aegis.config.aid = this.aid;
  },
});
