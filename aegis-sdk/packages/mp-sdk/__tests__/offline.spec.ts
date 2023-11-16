/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-ignore
import simulate from 'miniprogram-simulate';
import { join, triggerEvent } from './util/index';
import { testPv } from './util/common-test';

import './helper/global';
import mock from './helper/mock';

const requestStack: any[] = [];
mock([], requestStack);

require('./helper/aegis');

const uin = 123456;
wx.setStorageSync('ilive_uin', uin);
const component = join('components/report/index');
const id = simulate.load(component);
const comp = simulate.render(id);
const aegisBtn = comp.querySelector('.aegis-btn');

// TODO: 目前提供的工具不支持`getFileSystemManager`
// const fileSystem = wx.getFileSystemManager()
// const filePath = wx.env.USER_DATA_PATH + '/.aegis.offline.log'
describe('pv', () => {
  testPv(requestStack);
});

describe('offline log', () => {
  test('offline write file', async () => {
    triggerEvent(aegisBtn, 'report', ['aegis.report.offline']);
  });
});
