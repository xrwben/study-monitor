export { createRandomSamplePipe } from './sample';

export { createWriteReportPipe } from './write-before';

export { createThrottlePipe } from './throttle';

export { formatNormalLogPipe } from './format';

export { createLimitLengthPipe } from './length-limit';

export { createWhitelistPipe } from './whitelist';

export { createPvPipe } from './pv';

export { createSpeedRepeatLimitPipe, createErrorLogLimitPipe } from './repeat-limit';

export { reportPipe, reportEventPipe, reportCustomPipe } from './report';

export { beforeRequestHooks } from './beforeRequestHooks';

export { modifyRequestHooks } from './modifyRequestHooks';

export { afterRequestHooks } from './afterRequestHooks';

export type Pipe<M = any, N = any> = (msg: M, resolve: Resolve<N>) => void;
export type Resolve<M> = (msg: M) => void;
export type Pipeline<M = any, N = any> = (msg: M, end?: Resolve<N>) => any;

const noop = () => { };

// 生成管道
// 至少传入一个 pipe 函数
// 该函数会将传进来的Pipe一层一层包起来
// 功能很强大，无需理解，会用即可
export const createPipeline =  (pipeArr: Pipe[]): Pipeline => {
  if (!pipeArr || !pipeArr.reduce || !pipeArr.length) {
    throw new TypeError('createPipeline need at least one function param');
  }
  if (pipeArr.length === 1) {
    return (msg, resolve) => {
      pipeArr[0](msg, resolve || noop);
    };
  }
  return pipeArr.reduce((prePipe, pipe) => (msg, nextPipe = noop) => prePipe(msg, msg => (pipe?.(msg, nextPipe))));
};
