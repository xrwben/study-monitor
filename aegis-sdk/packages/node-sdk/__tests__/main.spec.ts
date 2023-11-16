
// describe('node sdk should work', () => {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Ags = require('../lib/aegis.min');
const aegis = new Ags({
  id: 'WwXOTRWOTUvbpGhCfa',
  uin: '123123',
  batchReportInterval: 3000,
  // selector: {
  //   type: 'host',
  // },
});
// it('test report speed log', () => {
aegis.reportSpeedLog({
  url: 'test_node_sdk',
  isHttps: true,
  method: 'post',
  duration: 123,
  ret: 0,
  status: 200,
});
// });
// it('report log', () => {
aegis.info('test log');
// });
// aegis.lifeCycle.on("beforeReportSpeed", (logs) => {
//   console.log("before report speed: ");
//   console.log("");
//   console.log(logs);
// });
// aegis.info("info log from demo");
// aegis.error('test node sdk error');
// });
