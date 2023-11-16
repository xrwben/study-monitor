
import simulate from 'miniprogram-simulate';

/**
 * 测试pv
 * @param requestStack
 */
export const testPv = function (requestStack: any[]) {
  test('aegis pv', async () => {
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
};
