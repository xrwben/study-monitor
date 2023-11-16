
export type WxApi = keyof typeof wx;
export type CloudApi = 'callFunction' | 'callContainer';
export type HackApi = WxApi | CloudApi;
export interface ReqOption {
  aegisRequestStartTime: number;
  apiName: HackApi;
}
export interface HackApiCallback<RequestOption = any, SucessRes = any, FailRes = any> {
  apiName?: HackApi;
  onStart?: (options: RequestOption) => void;
  success?: (
    res: SucessRes,
    options: RequestOption,
  ) => void;
  fail?: (
    err: FailRes,
    options: RequestOption,
  ) => void;
  complete?: (
    err: SucessRes | FailRes,
    options: RequestOption,
  ) => void;
}
export type HackApiCallbackOption = ReqOption & HackApiCallback;

export default abstract class HackApiCore<T extends HackApiCallbackOption, U extends HackApiCallback> {
  public apiName?: string;         // api名
  private callbacks: U[] = [];      // 收集所有代理回调函数
  private isOverride = false;
  public constructor(cb: U) {
    const { apiName } = cb;
    this.apiName = apiName;
    !this.isOverride && this.override();
    this.callbacks.push(cb);
  };
  public addCallback(cb: U) {
    if (cb) {
      this.callbacks.push(cb);
    }
  }
  protected prefixHandler(opts: T) {
    // 解决opts复用aegisRequestStartTime影响问题
    return { ...opts, aegisRequestStartTime: +new Date() };
  }
  protected successHandler<R>(res: R, opts: T) {
    this.callbacks.forEach((cb: U) => {
      try {
        cb.success?.(res, opts);
      } catch (err) {
        // empty
      }
    });
    opts.success?.(res, opts);
  }
  protected failHandler<R>(res: R, opts: T) {
    this.callbacks.forEach((cb: U) => {
      try {
        cb.fail?.(res, opts);
      } catch (err) {
        // empty
      }
    });
    opts.fail?.(res, opts);
  }
  protected completeHandler<R>(res: R, opts: T) {
    this.callbacks.forEach((cb: U) => {
      try {
        cb.complete?.(res, opts);
      } catch (err) {
        // empty
      }
    });
    opts.complete?.(res, opts);
  }
  // 代理
  private override() {
    try {
      this.defineApiProperty();
    } catch (err) {
      console.warn(`cannot override \`${this.apiName}\`, error is: ${err}`);
    } finally {
      this.isOverride = true;
    }
  }

  protected abstract defineApiProperty(): void;
}


