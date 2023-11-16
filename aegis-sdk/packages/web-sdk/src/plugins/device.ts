import Core, { Plugin } from 'aegis-core';

declare global {
  interface Navigator {
    connection: any;
  }
}
export enum NetworkTypeNum {
  unknown = 100,
  wifi = 1,
  net2g = 2,
  net3g = 3,
  net4g = 4,
  net5g = 5,
  net6g = 6,
}
enum PlatTypeNum {
  android = 1,
  ios = 2,
  windows = 3,
  macos = 4,
  linux = 5,
  other = 100,
}

export enum NetworkStatus {
  unknown = 100,
  normal = 0,
  weak = 1,
  disconnected = 2,
}
interface PlatformRegExp {
  [key: string]: RegExp;
}
type MatchPlatform = keyof PlatformRegExp | undefined;

export default new Plugin({
  name: 'device',
  onNewAegis(aegis) {
    aegis.extendBean('platform', this.getPlatform());
    aegis.extendBean('netType', NetworkTypeNum.unknown);
    this.getDpi(aegis);
    this.refreshNetworkTypeToBean(aegis);
    this.refreshNetworkStatusToBean(aegis);
  },
  // 获取分辨率
  getDpi(aegis: Core) {
    // viewport 屏幕可视区域大小
    aegis.extendBean('vp', `${Math.round(window.innerWidth)} * ${Math.round(window.innerHeight)}`);
    // screen rate 设备分辨率
    window.screen && aegis.extendBean('sr', `${Math.round(window.screen.width)} * ${Math.round(window.screen.height)}`);
  },
  // 获取设备类型
  getPlatform(): PlatTypeNum {
    const platformRegExp: PlatformRegExp = {
      // Android 是否需要通配大小写？
      android: /\bAndroid\s*([^;]+)/,
      ios: /\b(iPad|iPhone|iPod)\b.*? OS ([\d_]+)/,
      windows: /\b(Windows NT)/,
      macos: /\b(Mac OS)/,
      linux: /\b(Linux)/i,
      // other ,
    };
    const isMatchPlatform = (platform: keyof PlatformRegExp) => platformRegExp[platform].test(navigator.userAgent);
    const matchPlatform: MatchPlatform = Object.keys(platformRegExp).find(isMatchPlatform);
    // 平台：Android 1 iOS 2 Windows 3 MacOS 4 Linux 5 其他 100
    return matchPlatform
      ? PlatTypeNum[matchPlatform as keyof typeof PlatTypeNum]
      : PlatTypeNum.other;
  },
  // 根据网络变化刷新网络类型
  refreshNetworkTypeToBean(context: any) {
    const { config } = context;
    if (!config) {
      return;
    }
    let getNetworkTypeInterface: Function = getNetworkType;
    if (typeof config.getNetworkType === 'function') {
      getNetworkTypeInterface = config.getNetworkType;
    }
    getNetworkTypeInterface((type: NetworkTypeNum) => {
      if (!NetworkTypeNum[type]) {
        type = NetworkTypeNum.unknown;
      }
      context.extendBean('netType', type);
      // 每隔10秒更新一次
      this.NetworkRefreshTimer = setTimeout(() => {
        this.refreshNetworkTypeToBean(context);
        clearTimeout(this.NetworkRefreshTimer);
      }, 10000);
    });
  },
  // 根据网络变化刷新网络状态
  refreshNetworkStatusToBean(context: any) {
    const { config } = context;
    if (!config) {
      return;
    }

    let getNetworkStatusInterface: Function | undefined;
    if (typeof config.getNetworkStatus === 'function') {
      getNetworkStatusInterface = config.getNetworkStatus;
    }

    // 如果有getNetworkStatusInterface, 才开启
    getNetworkStatusInterface?.((status: NetworkStatus) => {
      if (NetworkStatus[status] === undefined) {
        status = NetworkStatus.unknown;
      }

      context.extendBean('netStatus', status);

      // 每隔10秒更新一次
      this.NetworkStatusRefreshTimer = setTimeout(() => {
        this.refreshNetworkStatusToBean(context);
        clearTimeout(this.NetworkStatusRefreshTimer);
      }, 10000);
    });
  },
});

// 标准化网络类型值
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

export const getNetworkType = function (callback: Function) {
  let netType = '';

  // 优先从 ua 中获取（微信会将网络类型注入 ua）
  const arr = navigator.userAgent.match(/NetType\/(\w+)/);
  if (arr) {
    [, netType] = arr;
  } else if (navigator.connection) {
    // navigator.connection 存在兼容性问题，当前不支持 ios
    netType = navigator.connection.effectiveType || navigator.connection.type;
  }

  if (!netType) {
    netType = 'unknown';
  }

  callback(parseNumberType(netType));
};


