/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-ignore
import simulate from 'miniprogram-simulate';
import { join, triggerEvent } from './util';
import sinon from 'sinon';
import './helper/global';
import mock from './helper/mock';
import { testPv } from './util/common-test';

const uin = 123456;
const requestStack: any[] = [];
const mocks = [
  {
    test: /aegis\/whitelist/,
    response: {
      data: { result: { is_in_white_list: true }, retcode: 0 },
    },
  },
];
mock(mocks, requestStack);
require('./helper/aegis');
const component = join('components/report/index');
const id = simulate.load(component);
const comp = simulate.render(id);
const aegisBtn = comp.querySelector('.aegis-btn');

describe('pv', () => {
  testPv(requestStack);
});
describe('pset uin', () => {
  let clock: sinon.SinonFakeTimers | null = null;
  beforeAll(() => {
    clock = sinon.useFakeTimers({ now: Date.now() });
  });
  afterAll(() => {
    clock!.restore();
  });

  test('set uin', async () => {
    triggerEvent(aegisBtn, 'setConfig', [], { uin });
    await clock!.tickAsync(1000);
    const whitelist = requestStack.some(url => (
      url.indexOf('aegis.qq.com/collect/whitelist') !== -1
    ));
    expect(whitelist).toBe(true);
    requestStack.length = 0;

    triggerEvent(aegisBtn, 'infoAll', ['aegis.info.in.whist']);
    await clock!.tickAsync(3000);
    const setUin = requestStack.some(url => (
      url.indexOf(`uin=${uin}`) > -1
    ));
    expect(setUin).toBe(true);
  });
});
