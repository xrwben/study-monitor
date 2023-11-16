/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-ignore
import simulate from 'miniprogram-simulate';
import sinon from 'sinon';
import { join, triggerEvent } from './util';
import { testPv } from './util/common-test';

import './helper/global';
import mock from './helper/mock';

const uin = 123456;
const requestStack: any[] = [];
const mocks = [
  {
    test: /aegis\/whitelist/,
    response: {
      data: { result: { is_in_white_list: false }, retcode: 0 },
    },
  },
];
mock(mocks, requestStack);

require('./helper/aegis');

wx.setStorageSync('ilive_uin', uin);
const component = join('components/report/index');
const id = simulate.load(component);
const comp = simulate.render(id);
const aegisBtn = comp.querySelector('.aegis-btn');

describe('pv', () => {
  testPv(requestStack);
});

describe('report', () => {
  let clock: sinon.SinonFakeTimers | null = null;
  beforeAll(() => {
    clock = sinon.useFakeTimers({ now: Date.now() });
  });
  afterAll(() => {
    clock!.restore();
  });

  test('error not merge report', async () => {
    // 默认重复5此以上不上报
    const num = 3;
    const errors = new Array(num).fill(1);
    errors.forEach(() => {
      triggerEvent(aegisBtn, 'report', ['ssss']);
    });

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(1);

    const { data = '', url = '' } = requestStack.pop() || {};

    expect(typeof data === 'string'
      && ~data.indexOf('aegis.report')
      && ~data.indexOf('conut=3')
      && ~url.indexOf(`uin=${uin}`));
  });

  test('aegis.report merge report', async () => {
    const num = 3;
    const errors = new Array(num).fill(1);
    errors.forEach(() => {
      triggerEvent(aegisBtn, 'report', ['aegis.report.merge']);
    });

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(1);

    const { url = '' } = requestStack.pop() || {};
    expect(~url.indexOf('aegis.report')
      && ~url.indexOf('msg[3]')
      && !~url.indexOf('msg[4]')
      && ~url.indexOf(`uin=${uin}`));

    expect(requestStack.length).toBe(0);
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

  test('info not in whist list can not report', async () => {
    triggerEvent(aegisBtn, 'info', ['aegis.info.in.whist']);

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(0);
  });

  // test('info not merge report', async () => {
  //   const num = 10
  //   const messages = new Array(num).fill(1)
  //   messages.forEach(() => {
  //     triggerEvent('info', [ 'aegis.info.in.whist' ])
  //   })

  //   await simulate.sleep(1100)

  //   expect(requestStack.length).toBe(1)

  //   const message = requestStack.pop()
  //   expect(
  //     ~message.indexOf('level[9]=2')
  //   )
  // })
});

describe('infoAll', () => {
  let clock: sinon.SinonFakeTimers | null = null;
  beforeAll(() => {
    clock = sinon.useFakeTimers({ now: Date.now() });
  });
  afterAll(() => {
    clock!.restore();
  });

  test('infoAll merge report', async () => {
    const num = 5;
    const messages = new Array(num).fill(1);
    messages.forEach(() => {
      triggerEvent(aegisBtn, 'infoAll', ['aegis.info.in.whist']);
    });

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(1);

    const { data = '' } = requestStack.pop() || {};
    expect(typeof data === 'string'
      && ~data.indexOf('level[9]=2'));
  });

  test('infoAll not merge report', async () => {
    const num = 5;
    const messages = new Array(num).fill(1);
    messages.forEach(() => {
      triggerEvent(aegisBtn, 'infoAll', ['aegis.info.in.whist']);
    });

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(1);

    const { data = '' } = requestStack.pop() || {};
    expect(typeof data === 'string'
      && ~data.indexOf('aegis.info')
      && ~data.indexOf('level[0]=2')
      && ~data.indexOf('count=5'));
  });

  test('infoAll max length is 5', async () => {
    const num = 6;
    const messages = new Array(num).fill(1);
    messages.forEach(() => {
      triggerEvent(aegisBtn, 'infoAll', ['aegis.info.in.whist']);
    });

    await clock!.tickAsync(2000);

    expect(requestStack.length).toBe(2);

    const { data: data1 = '' } = requestStack.pop() || {};
    expect(typeof data1 === 'string'
      && ~data1.indexOf('level[5]=2')
      && ~data1.indexOf('count=5'));

    const { data: data2 = '' } = requestStack.pop() || {};
    expect(typeof data2 === 'string'
      && ~data2.indexOf('level[1]=2')
      && ~data2.indexOf('count=1'));
  });
});
