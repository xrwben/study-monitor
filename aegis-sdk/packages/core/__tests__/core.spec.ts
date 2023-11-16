import Core from '../src/core';
import { Config } from '../src/interface';
const aegis = new Core({
  id: '666',
});

describe('core', () => {
  it('check config func', () => {
    const config: Config = {
      id: '123',
    };
    aegis.init(config);
    expect(aegis.bean.id).toBe(config.id);
    expect(aegis.bean.version).toBe(VERSION);
    expect(aegis.bean.uin).toBe('');
  });

  it('check extendBean func', () => {
    const key = 'url';
    const value = 'https://www.qq.com';
    aegis.extendBean(key, value);
    expect(aegis.bean[key]).toBe(value);
  });
});
