import Core, { Plugin } from 'aegis-core';
enum PlatTypeNum {
  android = 1,
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
export default new Plugin({
  name: 'device',
  async onNewAegis(aegis: Core) {
    aegis.extendBean('platform', this.getPlatform());
    aegis.extendBean('netType', NetworkTypeNum.unknown);
    // qucikapp 执行机制，setTimeout避免太早无法执行快应用原生方法
    // 过早的调用快应用原生的API会有警告提示，类似「请确认Native方法调用[system.network.getType()]发生在应用app的生命周期的创建['onCreate()']之后」
    this.quickAegisTimer = setTimeout(() => {
      this.refreshNetworkTypeToBean(aegis);
      this.getDpi(aegis);
      clearTimeout(this.quickAegisTimer);
    }, 100);
  },
  getPlatform() {
    // 平台：Android 1 iOS 2 Windows 3 MacOS 4 Linux 5 其他 100
    return PlatTypeNum.android;
  },
  // 获取分辨率
  getDpi(aegis: Core) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const device = require('@system.device');
      device.getInfo({
        success: (data: any) => {
          aegis.extendBean('vp', encodeURIComponent(`${Math.round(data?.windowWidth)} * ${Math.round(data?.windowHeight)}`));
          aegis.extendBean('sr', encodeURIComponent(`${Math.round(data?.screenWidth)} * ${Math.round(data?.screenHeight)}`));
        },
      });
    } catch (error) {
    }
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
  // 快应用官方自己定义的返回值
  if (net.indexOf('none') >= 0) return NetworkTypeNum.unknown;
  if (net.indexOf('bluetooth') >= 0) return NetworkTypeNum.unknown;
  if (net.indexOf('others') >= 0) return NetworkTypeNum.unknown;
  return NetworkTypeNum.unknown;
};

export const getNetworkType = function (callback: Function) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const network = require('@system.network');
    network.getType({
      success: (data: any) => {
        callback(parseNumberType(data?.type));
      },
    });
  } catch (error) {
    callback(parseNumberType(''));
  }
};
