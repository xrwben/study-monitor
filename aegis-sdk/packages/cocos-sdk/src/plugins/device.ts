import { Plugin } from 'aegis-core';

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

// 平台类型
type PlatformType = 'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'other';

// 平台类型映射
const PLATFORM_TYPE_MAP = {
  android: 1,
  ios: 2,
  windows: 3,
  macos: 4,
  linux: 5,
  other: 100,
};

export default new Plugin({
  name: 'device',
  onNewAegis(aegis) {
    aegis.extendBean('platform', this.getPlatform());
    aegis.extendBean('netType', NetworkTypeNum.unknown);
    aegis.extendBean('browser', `${cc.sys.browserType}(${cc.sys.browserVersion})`);
    this.refreshNetworkTypeToBean(aegis);
  },
  // 获取系统类型
  getPlatform(): PlatTypeNum {
    const os = cc.sys.os.toLocaleLowerCase() as PlatformType;
    return PLATFORM_TYPE_MAP[os] || PLATFORM_TYPE_MAP.other;
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

// 获取网络类型
export const getNetworkType = function (callback: Function) {
  let netType = '';

  // 实测证明cocos也是能拿到navigator的，但以防万一拿不到报错，还是加上这个判断
  if (!navigator || !navigator.userAgent) {
    netType = 'unknown';

    // 如果网络类型无法获取，cocos这里网络类型获取不准，默认将返回 cc.sys.NetworkType.LAN
    // export enum NetworkType {
    // 	NONE = 0,
    // 	LAN = 1,
    // 	WWAN = 2,
    // }
    return callback(parseNumberType(netType));
  }

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


