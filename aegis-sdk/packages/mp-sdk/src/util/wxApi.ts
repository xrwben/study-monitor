import { env } from '../adaptor';
import { compareVersion } from './index';


/**
 * 判断wx小程序中是否可用该api
 * @param apiName api名
 */

// 使用内存保存 version 字段，有用户反应频繁调用 getSystemInfoSync 影响性能
let version = '';
export const wxCanIUse = function (apiName: keyof WechatMiniprogram.Wx) {
  if (!version) {
    version = env.getSystemInfoSync().SDKVersion;
  }
  // 小程序插件不支持canIUse
  if (compareVersion(version, '1.1.1') && env.canIUse) {
    return env.canIUse(apiName);
  }
  return !!env[apiName];
};
/**
 * 获取小程序启动时的参数
 * @returns {Object}
 */
export const getLaunchOptionsSync = function () {
  // https://developers.weixin.qq.com/miniprogram/dev/reference/scene-list.html
  return wxCanIUse('getLaunchOptionsSync') ? env.getLaunchOptionsSync() : {
    scene: '',
  };
};


