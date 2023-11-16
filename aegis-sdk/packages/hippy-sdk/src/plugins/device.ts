import Core, { globalAny, Plugin } from 'aegis-core';

export enum NetworkType {
  unknown = 100,
  wifi = 1,
  net2g = 2,
  net3g = 3,
  net4g = 4,
  net5g = 5,
  net6g = 6,
}

export enum NetworkStatus {
  unknown = 100,
  normal = 0,
  weak = 1,
  disconnected = 2,
}

export default new Plugin({
  name: 'device',
  onNewAegis(aegis) {
    aegis.extendBean('netType', NetworkType.unknown);
    this.refreshNetworkTypeToBean(aegis);
    this.refreshNetworkStatusToBean(aegis);
    this.getDpi(aegis);
  },
  // 获取分辨率
  getDpi(aegis: Core) {
    const {
      device: {
        window,
        screen,
      },
    } = globalAny.Hippy;
    // 不算状态栏的视口
    aegis.extendBean('vp', encodeURIComponent(`${Math.round(window.width)} * ${Math.round(window.height)}`));
    // screen rate 设备分辨率
    aegis.extendBean('sr', encodeURIComponent(`${Math.round(screen.width)} * ${Math.round(screen.height)}`));
  },
  // 根据网络变化刷新网络类型
  refreshNetworkTypeToBean(context: any) {
    const { config } = context;
    if (!config) {
      return;
    }
    let getNetworkTypeInterface: Function | undefined;
    if (config.useSDKReportNetwork) {
      getNetworkTypeInterface = getNetworkType;
    }
    if (typeof config.getNetworkType === 'function') {
      getNetworkTypeInterface = config.getNetworkType;
    }
    // 如果有getNetworkTypeInterface，才开启
    getNetworkTypeInterface?.((type: NetworkType) => {
      if (!NetworkType[type]) {
        type = NetworkType.unknown;
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
const parseHippyNetworkType = (net: string) => {
  net = String(net).toLowerCase();
  if (net.indexOf('4g') >= 0) return NetworkType.net4g;
  if (net.indexOf('wifi') >= 0) return NetworkType.wifi;
  if (net.indexOf('5g') >= 0) return NetworkType.net5g;
  if (net.indexOf('6g') >= 0) return NetworkType.net6g;
  if (net.indexOf('3g') >= 0) return NetworkType.net3g;
  if (net.indexOf('2g') >= 0) return NetworkType.net2g;
  // hippy 自己的返回值
  if (net.indexOf('cell') >= 0) return NetworkType.net4g;
  return NetworkType.unknown;
};

export const getNetworkType = function (callback: Function) {
  const {
    bridge: { callNativeWithPromise },
  } = globalAny.Hippy;
  callNativeWithPromise?.('NetInfo', 'getCurrentConnectivity').then((result: { 'networkInfo': 'NONE' | 'WIFI' | 'CELL' | 'UNKNOWN' }) => {
    const { networkInfo: netType } = result;
    callback(parseHippyNetworkType(netType));
  });
  // 接口未返回的默认值
  setTimeout(() => {
    callback(NetworkType.unknown);
  }, 3000);
};


