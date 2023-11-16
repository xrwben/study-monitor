import { formatNormalLogPipe } from '../../src/pipes/format';

describe('plugin-pipes-format', () => {
  it('array log', () => {
    const log = [{
      msg: 'script error',
      level: 2,
    }, {
      msg: 'promise code',
      level: 6,
    }];
    formatNormalLogPipe(log, (res) => {
      expect(JSON.stringify(res)).toEqual(JSON.stringify(log));
    });
  });

  it('obj log', () => {
    const log = [{
      msg: 'script error',
      level: 2,
    }];
    formatNormalLogPipe(log, (res) => {
      expect(JSON.stringify(res)).toEqual(JSON.stringify(log));
    });
  });
});
