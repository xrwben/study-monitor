import '../../src/util/polyfill';

describe('websdk util polyfill', () => {
  it('test Object.assign fun', () => {
    const obj1 = {
      msg: 'script error',
    };
    const obj2 = {
      type: 2,
    };
    const result = {
      msg: 'script error',
      type: 2,
    };
    expect(JSON.stringify(Object.assign({}, obj1, obj2))).toBe(JSON.stringify(result));
  });
});
