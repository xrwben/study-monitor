import { createThrottlePipe } from '../../src/pipes/throttle';
import Core from '../../src/core';

const core = new Core({ delay: 0 });

describe('plugin-pipes-throttle', () => {
  it('no max length of msg', () => {
    const throttleFn = createThrottlePipe(core, 0);
    const msg1 = 'script error';
    const msg2 = 'promise error';
    throttleFn(msg1, (res) => {
      expect(JSON.stringify(res)).toBe(JSON.stringify([msg1]));
    });
    throttleFn(msg2, (res) => {
      expect(JSON.stringify(res)).toBe(JSON.stringify([msg1, msg2]));
    });
  });
  it('has max length of msg', () => {
    const throttleFn = createThrottlePipe(core, 1);
    const msg1 = 'script error';
    const msg2 = 'promise error';
    throttleFn(msg1, (res) => {
      expect(JSON.stringify(res)).toBe(JSON.stringify([msg1]));
    });
    throttleFn(msg2, (res) => {
      expect(JSON.stringify(res)).toBe(JSON.stringify([msg2]));
    });
  });
});
