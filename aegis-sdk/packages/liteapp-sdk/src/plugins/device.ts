import Core, { Plugin, PlatTypeNum, NetworkTypeNum } from 'aegis-core';
import { getSystemInfo, isPageRuntime } from '../util';


// 网络信息
type PlatTypeNumKey = keyof typeof PlatTypeNum;

const parseNumberType = (net: string) => {
  net = String(net).toLowerCase();
  if (net.indexOf('4g') >= 0) return NetworkTypeNum.net4g;
  if (net.indexOf('wifi') >= 0) return NetworkTypeNum.wifi;
  if (net.indexOf('5g') >= 0) return NetworkTypeNum.net5g;
  if (net.indexOf('6g') >= 0) return NetworkTypeNum.net6g;
  if (net.indexOf('3g') >= 0) return NetworkTypeNum.net3g;
  if (net.indexOf('2g') >= 0) return NetworkTypeNum.net2g;
  return NetworkTypeNum.unknown;
};


const plugin = new Plugin({
  name: 'device',

  async onNewAegis(aegis: Core) {
    this.setSystemInfo(aegis);

    if (aegis.config.useStore && isPageRuntime()) {
      // 已经使用了Store的页面线程，不执行后续的操作
      return;
    }
    this.refreshNetwork(aegis);
  },

  setSystemInfo(aegis: Core) {
    try {
      const systemInfo = getSystemInfo();
      const { platform, model, liteAppVersion, brand } = systemInfo;
      aegis.extendBean('platform', this.getPlatFormType(platform));
      aegis.extendBean('model', model);
      aegis.extendBean('version', liteAppVersion);
      aegis.extendBean('brand', brand);
      // viewport 屏幕可视区域大小
      // aegis.extendBean('vp', `${windowWidth} * ${windowHeight}`);
      // screen rate 屏幕高宽
      // aegis.extendBean('sr', `${screenWidth} * ${screenHeight}`);
    } catch (e) { }
  },

  // 获取平台类型
  getPlatFormType(platForm: string) {
    const platformRegExp: { [key in PlatTypeNumKey]?: RegExp } = {
      android: /android/i,
      ios: /ios/i,
      devtools: /devtools/i,
    };
    let platformType = PlatTypeNum.other;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < Object.keys(platformRegExp).length; i++) {
      const key = Object.keys(platformRegExp)[i];

      if (platformRegExp[key as PlatTypeNumKey]?.test(platForm)) {
        platformType = PlatTypeNum[key as PlatTypeNumKey];
        break;
      }
    }

    return platformType;
  },

  // 获取网络信息
  setNetworkType(aegis: Core) {
    const { networkType } = getSystemInfo();
    aegis.extendBean('netType', parseNumberType(networkType));
  },

  // 10s更新一次网络
  refreshNetwork(aegis: Core) {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.setNetworkType(aegis);

    this.timer = setTimeout(() => {
      this.refreshNetwork(aegis);
    }, 10000);
  },
});

export default plugin;
