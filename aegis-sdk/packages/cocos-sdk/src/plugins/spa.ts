/* eslint-disable prefer-rest-params */
import Core, { Plugin, SendType } from 'aegis-core';
import { getSceneName } from '../util/util';

let plugin = new Plugin({ name: 'spa' });
if (SPA) {
  plugin = new Plugin({
    name: 'spa',
    init() {
      cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH, this.afterSceneLaunch, this);
    },
    // 场景启动后
    afterSceneLaunch() {
      this.sendPv();
    },
    // 上报PV
    sendPv() {
      const sceneName = getSceneName();

      this.$walk((aegis: Core) => {
        const pvUrl = aegis.config.pvUrl || '';
        const splitSymbol = pvUrl.indexOf('?') === -1 ? '?' : '&';
        // 上报PV
        aegis.send({
          url: `${pvUrl}${splitSymbol}sceneName=${sceneName}`,
          type: SendType.PV,
        });
      });
    },
    destroy() {
      cc.director.off(cc.Director.EVENT_AFTER_SCENE_LAUNCH, this.afterSceneLaunch, this);
    },

  });
}

export default plugin;
