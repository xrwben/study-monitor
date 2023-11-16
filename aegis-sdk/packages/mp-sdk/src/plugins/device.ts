import Core, { Plugin, PlatTypeNum, NetworkTypeNum } from 'aegis-core';
import { wxCanIUse } from '../util/wxApi';
import { env } from '../adaptor';

/**
 * @description 系统信息
 * @tutorial: https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemInfo.html
 */
 type SystemInfo = WechatMiniprogram.SystemInfo;

// 网络信息
interface NetworkStatus {
  networkType: string;
}

type PlatTypeNumKey = keyof typeof PlatTypeNum;
type NetworkNumKey = keyof typeof NetworkTypeNum;

export const getNetworkType = function (network: string) {
  const networkRegExp: {[key in NetworkNumKey]?: RegExp} = {
    // 无网络先归为unkonwn
    unknown: /unknown|none/i,
    wifi: /wifi/i,
    net2g: /2g/i,
    net3g: /3g/i,
    net4g: /4g/i,
    net5g: /5g/i,
    net6g: /6g/i,
  };

  let networkType = NetworkTypeNum.unknown;

  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < Object.keys(networkRegExp).length ; i++) {
    const key = Object.keys(networkRegExp)[i];

    if (networkRegExp[key as NetworkNumKey]?.test(network)) {
      networkType = NetworkTypeNum[key as NetworkNumKey];
      break;
    }
  }

  return networkType;
};

const plugin = new Plugin({
  name: 'device',
  async onNewAegis(aegis: Core) {
    this.setSystemInfo(aegis);
    this.refreshNetwork(aegis);
    this.setNetworkChange(aegis);
  },
  setSystemInfo(aegis: Core) {
    try {
      if (wxCanIUse('getSystemInfo')) {
        env.getSystemInfo({
          success: (res: SystemInfo) => {
            const { platform, model, windowHeight, windowWidth, screenWidth = 0, screenHeight = 0 } = res;
            aegis.extendBean('platform', this.getPlatFormType(platform));
            aegis.extendBean('model', model);
            // viewport 屏幕可视区域大小
            // eslint-disable-next-line radix
            aegis.extendBean('vp', `${Math.round(windowWidth)} * ${Math.round(windowHeight)}`);
            // screen rate 屏幕高宽
            aegis.extendBean('sr', `${Math.round(screenWidth)} * ${Math.round(screenHeight)}`);
          },
        });
      }
    } catch (e) {}
  },
  // 获取平台类型
  getPlatFormType(platForm: string) {
    const platformRegExp: {[key in PlatTypeNumKey]?: RegExp} = {
      android: /android/i,
      ios: /ios/i,
      windows: /windows/i,
      macos: /mac/i,
      devtools: /devtools/i,
    };
    let platformType = PlatTypeNum.other;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < Object.keys(platformRegExp).length ; i++) {
      const key = Object.keys(platformRegExp)[i];

      if (platformRegExp[key as PlatTypeNumKey]?.test(platForm)) {
        platformType = PlatTypeNum[key as PlatTypeNumKey];
        break;
      }
    }

    return platformType;
  },
  // 网络变更事件
  setNetworkChange(aegis: Core) {
    if (wxCanIUse('onNetworkStatusChange')) {
      // 此api偶尔会失效
      env.onNetworkStatusChange((res: NetworkStatus) => {
        const networkType = getNetworkType(res.networkType);
        aegis.extendBean('netType', networkType);
      });
    }
  },
  // 获取网络信息
  setNetworkType(aegis: Core) {
    if (wxCanIUse('getNetworkType')) {
      env.getNetworkType({
        success: (res) => {
          const networkType = getNetworkType(res.networkType);
          aegis.extendBean('netType', networkType);
        },
      });
    }
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
