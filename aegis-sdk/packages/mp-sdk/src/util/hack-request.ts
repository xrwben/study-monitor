import HackApiCore, { ReqOption, HackApiCallback } from './hack-api';

const env = wx || qq;
const originRequest = env.request;
// 通过向opts添加 aegisRequestStartTime key来记录请求开始时间
export type RequestOption = ReqOption & WechatMiniprogram.RequestOption;
export type HackRequestCallback = HackApiCallback<RequestOption,
WechatMiniprogram.RequestSuccessCallbackResult,
WechatMiniprogram.GeneralCallbackResult>;

export class HackRequest extends HackApiCore<RequestOption, HackRequestCallback> {
  public apiName: 'request';
  protected defineApiProperty(): void {
    Object.defineProperty(env, 'request', {
      get: () => this.hackHandler.bind(this),
    });
  };
  private hackHandler(options: RequestOption) {
    const opts = this.prefixHandler(options);
    return originRequest({
      ...opts,
      success: (res) => {
        this.successHandler(res, opts);
      },
      fail: (res) => {
        this.failHandler(res, opts);
      },
      complete: (res) => {
        this.completeHandler(res, opts);
      },
    });
  }
}

let hackReq: HackRequest;

export const hackRequest = function (option: HackRequestCallback) {
  if (!hackReq) {
    hackReq = new HackRequest(option);
  } else {
    hackReq.addCallback(option);
  }
  return hackReq;
};

// 格式化 request 和 response header
export const formatHeader = function (headers: HeadersInit | undefined, reqHeaders: string[], tag: string) {
  return reqHeaders?.length && typeof headers === 'object'
    ? reqHeaders.reduce((result: string, current: keyof HeadersInit) => {
      const value = headers[current];
      if (value) {
        const lineTxt = `${result === '' ? '\n' : '\n\n'}${tag} header ${current}: ${value}`;
        return result + lineTxt;
      }
      return result;
    }, '') : '';
};
