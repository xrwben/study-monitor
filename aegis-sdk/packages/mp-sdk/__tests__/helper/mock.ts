export interface Mock {
  test: RegExp;
  response: any;
  delay?: number;
  ignore?: boolean;
}

let hasRequestOverride = false;
export default function mock(mocks: Mock[] = [], requestStack: any[] = []) {
  if (!hasRequestOverride) {
    (global as any).wx.request = function (opts: any) {
      const shouldIgnore = mocks.some((mock) => {
        if (opts.url.match(mock.test)) {
          setTimeout(() => {
            opts.success?.(mock.response);
          }, mock.delay || 0);

          return mock.ignore;
        }

        return false;
      });

      // 所有请求的complete回调都会执行
      setTimeout(() => {
        opts.complete?.();
      }, 0);

      !shouldIgnore && requestStack.push(opts.url);
    };

    hasRequestOverride = true;
  }
}
