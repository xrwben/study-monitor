import {
  createBatchReportPipe,
} from '../src/pipes/batch-report-pipe';


describe('plugin-pipes-throttle', () => {
  it('batch report worked', (done) => {
    const batchNum = 5;
    const total = 12;
    const batchReportFn = createBatchReportPipe({}, {
      batchNum,
    });
    const msgs = Array(total).fill(0)
      .map((_, idx) => idx + 1);
    let callCount = 0;
    const matches = Array(Math.ceil(total / batchNum)).fill(1)
      .map((_, idx) => {
        const start = idx * batchNum;
        let end = (idx + 1) * batchNum;
        if (end > msgs.length) end = msgs.length;
        return msgs.slice(start, end);
      });
    const handle = (res: any[]) => {
      expect(res).toEqual(matches[callCount]);
      callCount += 1;
    };
    msgs.forEach(msg => batchReportFn(msg, handle));
    setTimeout(() => {
      expect(callCount).toEqual(Math.ceil(total / batchNum));
      done();
    }, (Math.ceil(total / batchNum) + 1) * 1000);
  });
});
