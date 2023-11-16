
import Core,
{
  Plugin,
  SendType,
} from 'aegis-core';
import 'web-vitals/dist/polyfill';
import {
  getFCP,
  getLCP,
  getFID,
  getCLS,
} from 'web-vitals/base';
import { canUseResourceTiming, canUseWebVitals, onHidden } from '../util';
let plugin = new Plugin({ name: 'webVitals' });
interface WebVitalsFields {
  FCP: number;
  LCP: number;
  FID: number;
  CLS: number;
  [key: string]: any;
}
const webVitalsData: WebVitalsFields = {
  FCP: -1,
  LCP: -1,
  FID: -1,
  CLS: -1,
};
const addToWebVitals = (log: { name: string; value: number }) => {
  const { name, value } = log;
  if (value > 0) {
    webVitalsData[name] = value;
  }
};
if (WEB_VITALS && !IS_IE) {
  plugin = new Plugin({
    name: 'webVitals',
    onNewAegis(aegis: Core) {
      if (!canUseResourceTiming() || !canUseWebVitals()) return;
      try {
        getFCP(addToWebVitals);
        getLCP(addToWebVitals);
        getFID(addToWebVitals);
        getCLS(addToWebVitals);
        onHidden(this.publish.bind(this, aegis), true);
      } catch (e) { }
    },
    publish(instance: Core) {
      this.$walk((aegis: Core) => {
        if (aegis !== instance) return;
        aegis.sendPipeline?.([(log: WebVitalsFields, resolve: any) => {
          const params: string[] = [];
          // eslint-disable-next-line no-restricted-syntax
          for (const key in log) {
            params.push(`${key}=${log[key]}`);
          }
          const splitSymbol = aegis.config?.performanceUrl?.indexOf('?') === -1 ? '?' : '&';
          resolve({
            url: `${aegis.config.webVitalsUrl}${splitSymbol}${params.join('&')}`,
            type: SendType.VITALS,
            log,
            sendBeacon: true,
          });
        }], SendType.VITALS)(webVitalsData);
      });
    },
    destroy() {
      this.option.publish = function () { };
    },
  });
}
export default plugin;
