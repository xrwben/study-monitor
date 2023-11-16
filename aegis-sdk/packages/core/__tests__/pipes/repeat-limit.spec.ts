import { createSpeedRepeatLimitPipe, createErrorLogLimitPipe } from '../../src/pipes/repeat-limit';
import {
  LogType,
} from '../../src/interface/log';
const limitFn = createSpeedRepeatLimitPipe({
  speedSample: true,
  repeat: 1,
});
describe('plugin-pipes-repeat-limit', () => {
  it('check fn return value type', () => {
    expect(typeof limitFn).toBe('function');
  });

  it('array log no repeat', () => {
    const log = [{
      url: 'https://a.qq.com',
    }, {
      url: 'https://b.qq.com',
    }];
    limitFn(log, (res) => {
      expect(JSON.stringify(res)).toEqual(JSON.stringify(log));
    });
  });

  it('array log repeat', () => {
    const log = [{
      url: 'https://a.qq.com',
    }, {
      url: 'https://a.qq.com',
    }];
    const logA = [{
      url: 'https://a.qq.com',
    }];
    limitFn(log, (res) => {
      expect(JSON.stringify(res)).toEqual(JSON.stringify(logA));
    });
  });

  it('object log no repeat', () => {
    const log = {
      url: 'https://a.qq.com',
    };
    const logA = {
      url: 'https://b.qq.com',
    };
    limitFn(log, () => { });
    limitFn(logA, (res) => {
      expect(JSON.stringify(res)).toEqual(JSON.stringify(logA));
    });
  });

  it('object log repeat', () => {
    const log = {
      url: 'https://a.qq.com',
    };
    const logA = {
      url: 'https://a.qq.com',
    };
    limitFn(log, () => { });
    limitFn(logA, (res) => {
      expect(JSON.stringify(res)).toBe('');
    });
  });
  it('error no repeat', () => {
    const errorPipe = createErrorLogLimitPipe({
      repeat: 0,
    });
    const fn = jest.fn();
    new Array(10).fill(0)
      .forEach(() => errorPipe({
        msg: 'test error',
        level: LogType.ERROR,
      }, fn));
    expect(fn).toBeCalledTimes(10);
  });
});

