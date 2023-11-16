import { buildLogParam, encodeOnce } from '../../src/util';
import { NormalLog, LogType } from '../../src/interface';
describe('core-util-index', () => {
  it('check encodeOnce func', () => {
    const log = 'msg: error log';
    expect(encodeOnce(log)).toBe(encodeURIComponent(decodeURIComponent(log)));
  });

  it('check buildLogParam func', () => {
    const logObj: NormalLog = {
      msg: 'Error: script error',
      level: LogType.ERROR,
    };
    const realObjResult = 'msg[0]=Error%3A%20script%20error&level[0]=4&count=1';
    expect(buildLogParam(logObj)).toBe(realObjResult);

    const logArr = [{
      msg: 'Error: script error',
      level: LogType.ERROR,
    }, {
      msg: 'Promise: code error',
      level: LogType.PROMISE_ERROR,
    }];
    const realArrResult = 'msg[0]=Error%3A%20script%20error&level[0]=4&msg[1]=Promise%3A%20code%20error&level[1]=8&count=2';
    expect(buildLogParam(logArr)).toBe(realArrResult);
  });
});
