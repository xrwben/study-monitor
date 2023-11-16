/* eslint-disable prefer-rest-params */
import Core, { Plugin, SendType } from 'aegis-core';

let plugin = new Plugin({ name: 'spa' });
const hasWrittenKey = '__hasWrittenByTamSpa';
const HACK_HISTORY_APIS = ['replaceState', 'pushState', 'popstate', 'hashchange'];
if (SPA) {
  plugin = new Plugin({
    name: 'spa',
    originFireUrl: '',
    onNewAegis(aegis: Core) {
      history.pushState = this.wr('pushState') || history.pushState;
      history.replaceState = this.wr('replaceState') || history.replaceState;
      this.sendPv = this.sendPv.bind(this);
      aegis.config.spa && this.sendPv(aegis);
      HACK_HISTORY_APIS.forEach(event => window.addEventListener(event, () => this.sendPv.call(this, aegis)));
    },
    wr(type: string) {
      const origin = history[type];
      // 不通过native code判断，避免replaceState和pushState被其他代码重写之后不再往下执行
      // wr需要对多个type进行复写，用不同的key标志: __{type}__hasWrittenByTamSpa
      const hasWrittenKeyByType = `__${type}${hasWrittenKey}`;
      if (typeof origin !== 'function' || history[hasWrittenKeyByType]) {
        return false;
      }
      Object.defineProperty(history, hasWrittenKeyByType, {
        value: true,
        enumerable: false,
      });
      return function () {
        // @ts-ignore
        const res = origin.apply(this, arguments);
        let event = null;
        if (typeof Event === 'function') {
          event = new Event(type);
        } else {
          // 兼容ie
          event = document.createEvent('HTMLEvents');
          event.initEvent(type, false, true);
        }
        window.dispatchEvent(event);
        return res;
      };
    },
    sendPv(instance: Core) {
      // 避免 replaceState + pushState 在一个页面内一起用时造成重复收集。
      // 两个方法实际只会产生一个效果，而我们只需要最终效果，中间 url 不会有渲染逻辑，应该被丢掉
      // 使用 setTimeout 保证在最终完成 url 变更只会才执行内部操作，参考 https://github.com/googleanalytics/autotrack/blob/master/lib/plugins/url-change-tracker.js#L115
      setTimeout(() => {
        const { href } = location;
        const firedUrl = location.pathname + location.hash + instance.config.id;
        // 发送PV
        this.$walk((aegis: Core) => {
          if (aegis !== instance) return;
          const { pvUrl } = aegis.config;
          // 如果 url 并没有发生变化时，没有必要上报
          if (!pvUrl || !firedUrl || firedUrl === this.originFireUrl) {
            return;
          }

          aegis.sendPipeline([(log, resolve: any) => {
            resolve({
              url: `${pvUrl}?from=${encodeURIComponent(href)}`,
              beanFilter: ['from'],
              type: SendType.PV,
            });
          }], SendType.PV)(null);

          // 记录最新 url
          this.originFireUrl = firedUrl;
        });
      }, 0);
    },
    destroy() {
      this.option.sendPv = function () {};
    },
  });
}

export default plugin;
