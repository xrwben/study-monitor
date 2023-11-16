import HackApiCore, { ReqOption, HackApiCallback, CloudApi } from './hack-api';

const env = wx || qq;
type HackApiMap = { [x in CloudApi]?: { originApi: Function, hackCloudReq: HackCloud<ReqOption, HackApiCallback> } };

export const originApiMap: HackApiMap = {};

export type OptReqs = ReqOption & ICloud.CallFunctionParam & ICloud.CallContainerParam;
export class HackCloud<T extends ReqOption, U extends HackApiCallback> extends HackApiCore<T, U> {
  public apiName: 'callFunction' | 'callContainer';
  protected defineApiProperty(): void {
    if (!env.cloud || !env.cloud[this.apiName]) {
      return;
    }
    Object.defineProperty(env.cloud, this.apiName, {
      get: () => this.hackHandler.bind(this),
    });
  };
  private hackHandler(options: T) {
    const opts = this.prefixHandler(options);
    return new Promise((resolve, reject) => {
      const originApi = originApiMap[this.apiName]?.originApi;
      originApi?.({
        ...opts,
        success: (res: ICloud.CallFunctionResult | ICloud.CallContainerResult) => {
          this.successHandler(res, opts);
          resolve(res);
        },
        fail: (res: any) => {
          this.failHandler(res, opts);
          reject(res);
        },
        complete: (res: any) => {
          this.completeHandler(res, opts);
        },
      });
    });
  }
};

export const hackCloud = function <T extends ReqOption, U extends HackApiCallback> (option: U) {
  const { apiName } = option;
  const wxApiKey = apiName as CloudApi;
  const hackApi = originApiMap[wxApiKey];
  if (!hackApi) {
    const originApi = env.cloud[wxApiKey];
    originApiMap[wxApiKey] = {
      hackCloudReq: new HackCloud<T, U>(option),
      originApi,
    };
  } else {
    hackApi.hackCloudReq.addCallback(option);
  }
  return originApiMap[wxApiKey];
};
