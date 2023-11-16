/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-ignore
import simulate from 'miniprogram-simulate';
import sinon from 'sinon';
import { join, triggerEvent } from './util';

import './helper/global';
import mock from './helper/mock';

const requestStack: any[] = [];
const mocks = [
  {
    test: /collect\/whitelist/,
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

describe('whitelist', () => {
  test('aegis whitelist', async () => {
    await simulate.sleep(1000);
    expect(requestStack.length).toBe(2);
    const whitelist = requestStack.some(url => (
      url.indexOf('aegis.qq.com/collect/whitelist') !== -1
    ));
    const pv = requestStack.some(url => (
      url.indexOf('aegis.qq.com/collect/') !== -1
    ));
    expect(whitelist).toBe(true);
    expect(pv).toBe(true);
    requestStack.length = 0;
  });
});

describe('info', () => {
  let clock: sinon.SinonFakeTimers | null = null;
  beforeAll(() => {
    clock = sinon.useFakeTimers({ now: Date.now() });
  });
  afterAll(() => {
    clock!.restore();
  });

  test('info in whist list', async () => {
    triggerEvent(aegisBtn, 'info', ['aegis.info.in.whist']);

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(1);
  });
});
