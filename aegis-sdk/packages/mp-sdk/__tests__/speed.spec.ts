/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-ignore
import simulate from 'miniprogram-simulate';
import sinon from 'sinon';
import { join, getQuery } from './util';
import { testPv } from './util/common-test';

import './helper/global';
import mock from './helper/mock';

const requestStack: any[] = [];
const mocks = [
  {
    test: /\.com\/cgi-1/,
    delay: 200,
    ignore: true,
    response: {
      header: { 'Content-Type': 'text/json' },
      data: {},
    },
  },
  {
    test: /\/aegis-test\.com\/cgi-2/,
    delay: 200,
    ignore: true,
    response: {
      header: { 'Content-Type': 'text/json' },
      data: {},
    },
  },
  {
    test: /uin=is_white_list_for_test/,
    delay: 200,
    ignore: false,
    response: {
      header: { 'Content-Type': 'text/json' },
      data: {
        retcode: 0,
        result: { is_in_white_list: true, rate: {} },
      },
    },
  },
];
mock(mocks, requestStack);

require('./helper/aegis');

const component = join('components/speed/index');
const id = simulate.load(component);
const comp = simulate.render(id);
const aegisBtn = comp.querySelector('.aegis-btn');
const aegisBtnEvent = comp.querySelector('.aegis-btn-event');

const triggerCgi = function (url = '/') {
  aegisBtn?.dispatchEvent('tap', {
    detail: {
      url,
    },
  });
};

const triggerEvent = function (method: string, args: any[], config: object = {}) {
  aegisBtnEvent?.dispatchEvent('tap', {
    detail: {
      method,
      args,
      config,
    },
  });
};

const getPayload = function (url: string) {
  try {
    return JSON.parse(decodeURIComponent(getQuery(url, 'payload') || '{}'));
  } catch (err) {
    return {};
  }
};

describe('pv', () => {
  testPv(requestStack);
});

describe('speed', () => {
  let clock: sinon.SinonFakeTimers | null = null;
  beforeAll(() => {
    clock = sinon.useFakeTimers({ now: Date.now() });
  });
  afterAll(() => {
    clock!.restore();
  });

  // 横跳
  test('report speed', async () => {
    triggerCgi('https://aegis-test.com/cgi-1');

    await clock!.tickAsync(2000);
    if (!requestStack.length) return;
    expect(requestStack.length).toBe(1);

    const { data = {} } = requestStack.pop() || {};
    expect(typeof data === 'object'
      && typeof (data as any).payload === 'string');
    const payload = JSON.parse((data as any).payload);
    expect(payload.duration.fetch[0].duration).toBeLessThanOrEqual(230);
  });

  // 再次横跳，哎呀被限制啦啦啦啦，相同CGI只能上报一次呀呀呀呀呀~
  test('report speed limit', async () => {
    triggerCgi('https://aegis-test.com/cgi-1');

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(0);
  });

  // 虚假的反复横跳
  test('report speed multiply', async () => {
    const num = 10;
    const fetches = new Array(num).fill(4);

    fetches.forEach(() => {
      triggerCgi(`https://aegis-test.com/cgi-1${Math.random()}`);
    });

    await clock!.tickAsync(2000);
    if (!requestStack.length) return;
    const { data = {} } = requestStack.pop() || {};
    const payload = JSON.parse((data as any).payload);

    expect(payload.duration.fetch.length).toBe(10);
  });

  // 认真反复横跳
  test('report speed multiply', async () => {
    const num = 10;
    const fetches = new Array(num).fill(4);
    fetches.forEach(() => {
      triggerCgi(`https://aegis-test.com/cgi-1${Math.random()}`);
    });

    await clock!.tickAsync(2000);
    if (!requestStack.length) return;
    expect(requestStack.length).toBe(1);

    const { data } = requestStack.pop() || {};
    const payload = JSON.parse((data as any).payload);

    expect(payload.duration.fetch.length).toBe(fetches.length);
  });

  // 横跳，但是不幸被拦截，不对，是被忽略了，哈哈哈哈哈哈哈~
  // test('report ignore speed', async () => {
  //   const num = 1
  //   const fetches = new Array(num).fill(4)
  //   fetches.forEach(() => {
  //     triggerCgi('https://ignore.aegis.com/cgi-1' + Math.random())
  //   })

  //   await clock.tickAsync(2000)

  //   expect(requestStack.length).toBe(0)
  // })
});

describe('custom speed', () => {
  let clock: sinon.SinonFakeTimers | null = null;
  beforeAll(() => {
    clock = sinon.useFakeTimers({ now: Date.now() });
  });
  afterAll(() => {
    clock!.restore();
  });

  test('custom time and timeEnd', async () => {
    triggerEvent('time', ['test']);
    triggerEvent('time', ['test-1']);
    await clock!.tickAsync(100);
    triggerEvent('timeEnd', ['test']);
    await clock!.tickAsync(100);
    triggerEvent('timeEnd', ['test-1']);
    await clock!.tickAsync(3000);

    // const { url } = requestStack.pop()
    // const payload = getPayload(url)
    if (!requestStack.length) return;
    const url = requestStack.pop() || {};
    const payload = getPayload(url);
    expect(~url.indexOf('aegis.qq.com/speed/custom'));
    expect(payload.custom.length).toBe(2);
    expect(payload.custom[0].duration).toBeLessThan(120);
    expect(payload.custom[1].duration).toBeLessThan(240);
  });

  test('custom reportTime', async () => {
    triggerEvent('reportTime', ['test', 200]);
    await clock!.tickAsync(3000);

    const url = requestStack.pop() || {};
    const payload = getPayload(url);
    expect(~url.indexOf('aegis.qq.com/speed/custom'));
    expect(payload.custom.length).toBe(1);
    expect(payload.custom[0].duration).toBe(200);
  });

  test('custom reportTime with ext', async () => {
    triggerEvent('reportTime', [{ name: 'test', duration: 200, ext1: '123' }]);
    await clock!.tickAsync(3000);

    const url = requestStack.pop() || {};
    const payload = getPayload(url);
    expect(~url.indexOf('aegis.qq.com/speed/custom'));
    expect(payload.custom.length).toBe(1);
    expect(payload.custom[0].duration).toBe(200);
  });
});

describe('cgi report speed log', () => {
  let clock: sinon.SinonFakeTimers | null = null;
  beforeAll(() => {
    clock = sinon.useFakeTimers({ now: Date.now() });
  });
  afterAll(() => {
    clock!.restore();
  });

  test('report speed log in whitelist', async () => {
    triggerEvent('setConfig', [{ uin: 'is_white_list_for_test' }]);
    await clock!.tickAsync(3000);
    if (!requestStack.length) return;
    expect(requestStack.length).toBe(1);
    requestStack.pop();

    triggerCgi('https://aegis-test.com/cgi-2');
    await clock!.tickAsync(3000);
    if (!requestStack.length) return;
    // TODO: 这里用例不好，没有详细检查白名单上报的参数，因为目前观察到把前面测试用例都上传了
    expect(requestStack.length).toBe(2);
    const { data = {} } = requestStack.pop() || {};
    expect(typeof data === 'object'
      && typeof (data as any).payload === 'string');
    const payload = JSON.parse((data as any).payload);
    expect(payload.duration.fetch[0].duration).toBeLessThanOrEqual(230);
  });
});
