import { callFnInBatch } from './util';

jest.setTimeout(60 * 10 * 1000);
describe('node sdk should work', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Ags = require('../lib/aegis.min');
  const createAegis = (keepalive?: boolean) => {
    const aegis = new Ags({
      id: 'WwXOTRWOTUvbpGhCfa',
      uin: '123123',
      batchReportInterval: 500,
      //   selector: {
      //     type: 'host',
      //   },
      ...keepalive ? {
        keepalive: true,
      } : {},
    });
    return aegis;
  };
  it('keepalive worked', () => {
    const keepaliveAegis = createAegis(true);
    expect(keepaliveAegis.reqProtocol.agent).not.toBeUndefined();
    const noKeepaliveAegis = createAegis();
    expect(noKeepaliveAegis.reqProtocol.agent).toBeUndefined();
  });
  it('run as normal', async () => {
    const aegis = createAegis(true);
    await callFnInBatch(() => {
      aegis.reportSpeedLog({
        url: 'test_node_sdk',
        isHttps: true,
        method: 'post',
        duration: 123,
        ret: 0,
        status: 200,
      });
    }, {
      interval: 300,
      times: 10,
      batchNum: 10,
    });
    const { agent } = aegis.reqProtocol;
    if (agent) {
      console.log('agent status: %j', agent.getCurrentStatus());
      await new Promise((resolve) => {
        setTimeout(() => {
          if (agent.statusChanged) {
            console.log('agent status: %j', agent.getCurrentStatus());
          }
          resolve(undefined);
        }, 3000);
      });
    }
  });
});
