
export const callFnLimitTimes = (fn: (...args: any[]) => any, options: {
  // 时间间隔， ms
  interval: number;
  // 多少次后停止
  times: number;
}) => new Promise((resolve) => {
  let cur = 0;
  const totalCount = options.times;
  // eslint-disable-next-line prefer-const
  let ref: any;
  const execFn = () => {
    cur += 1;
    if (cur >= totalCount) {
      clearInterval(ref);
      resolve();
      return;
    }
    fn();
  };
  execFn();
  ref = setInterval(execFn, options.interval);
});

export const callFnInBatch = (fn: (...args: any[]) => any, options: {
  batchNum: number;
  times: number;
  interval: number;
}) => callFnLimitTimes(() => {
  for (let i = 0; i < options.batchNum; ++i) {
    fn();
  }
}, options);
