import HackApiCore, { HackApiCallback, HackApiCallbackOption, WxApi } from './hack-api';

const env = wx || qq;
type HackApiMap = { [x in WxApi]?: { originApi: Function, hackReq: HackNetWork<any, any> } };

export const originApiMap: HackApiMap = {};

export class HackNetWork<T extends HackApiCallbackOption, U extends HackApiCallback> extends HackApiCore<T, U> {
  protected defineApiProperty(): void {
    Object.defineProperty(env, this.apiName as WxApi, {
      get: () => this.hackHandler.bind(this),
    });
  };
  private hackHandler(options: T) {
    const opts = this.prefixHandler(options);
    const originApi = originApiMap[this.apiName as WxApi]?.originApi;
    return originApi?.({
      ...opts,
      success: (res: any) => {
        this.successHandler(res, opts);
      },
      fail: (res: any) => {
        this.failHandler(res, opts);
      },
      complete: (res: any) => {
        this.completeHandler(res, opts);
      },
    });
  }
}

export const hackNetWork = function <T extends HackApiCallbackOption, U extends HackApiCallback> (option: U) {
  const { apiName } = option;
  const wxApiKey = apiName as WxApi;
  const hackApi = originApiMap[wxApiKey];
  if (!hackApi) {
    const originApi = wx[wxApiKey] as Function;
    originApiMap[wxApiKey] = {
      hackReq: new HackNetWork<T, U>(option),
      originApi,
    };
  } else {
    hackApi.hackReq.addCallback(option);
  }
  return originApiMap[wxApiKey];
};
