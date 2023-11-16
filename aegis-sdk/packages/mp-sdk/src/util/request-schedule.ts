import {
  SendOption,
  SendSuccess,
  SendFail,
} from 'aegis-core';

type Task = {
  options: SendOption;
  success?: SendSuccess;
  fail?: SendFail
};

// 小程序请求并发限制模块
export class RequestSchedule {
  private taskQueue: Task[] = [];
  private count = 1;
  private sendRequest: Function;
  private maxCount = 2; // 默认统一时间最多支持 2 个并发

  public constructor(sendRequest: Function, maxCount?: number | undefined) {
    maxCount && (this.maxCount = maxCount);
    this.sendRequest = sendRequest;
  }

  public addTask = (task: Task) => {
    this.taskQueue.push(task);
  };

  public fireTask = () => {
    const total = this.taskQueue.length;
    if (this.count > this.maxCount || total === 0) {
      return;
    }
    this.count = this.count + 1;
    const task: Task | undefined = this.taskQueue.shift();
    task && this.sendRequest(task.options, task?.success, task?.fail);
  };

  public complete = () => {
    if (this.count > 1) {
      this.count = this.count - 1;
    }
    this.fireTask();
  };
}
