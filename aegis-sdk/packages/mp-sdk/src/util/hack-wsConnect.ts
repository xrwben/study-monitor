import HackApiCore, { ReqOption, HackApiCallback } from './hack-api';

const env = wx || qq;
const originConnect = env.connectSocket;
// 通过向opts添加 aegisRequestStartTime key来记录请求开始时间
export type ConnectOption = ReqOption & WechatMiniprogram.ConnectSocketOption;
export type HackConnectCallback = HackApiCallback<ConnectOption,
WechatMiniprogram.ConnectSocketSuccessCallback,
WechatMiniprogram.GeneralCallbackResult>;
type TaskHackConf = {
  onError: WechatMiniprogram.UDPSocketOnErrorCallback;
  send: HackApiCallback
};
type HackWsConnectOpt = {
  connectCallback: HackConnectCallback
  taskOpt?: TaskHackConf
};
// websocket的hackconnect返回task的hack，主要是存储err监听和send。
class TaskHack {
  private onErrors: WechatMiniprogram.UDPSocketOnErrorCallback[];
  private sends: HackApiCallback[];
  public constructor() {
    this.onErrors = [];
    this.sends = [];
  }
  public addConfig(opt: TaskHackConf) {
    const { send, onError } = opt;
    if (send) {
      this.sends.push(send);
    }
    if (onError) {
      this.onErrors.push(onError);
    }
  }
  public toHack(task: WechatMiniprogram.SocketTask) {
    // 对task进行监听error操作
    this.onErrors.forEach((onError) => {
      task.onError(onError);
    });
    const originSend = task.send;
    // 对task的send方法进行拦截
    Object.defineProperty(task, 'send', {
      get: () => (opts: WechatMiniprogram.SocketTaskSendOption) => new Promise((reject) => {
        originSend.call(task, {
          ...opts,
          fail: (err: string) => {
            this.sends.forEach((send) => {
              send.fail?.(err, opts);
            });
            reject(err);
          },
        });
      }),
    });
    return task;
  }
}

// mock websocket连接函数。
export class HackWsConnect extends HackApiCore<ConnectOption, HackConnectCallback> {
  public apiName: 'connectSocket';
  private taskHack: TaskHack;
  public constructor(props: HackConnectCallback) {
    super(props);
    this.taskHack = new TaskHack();
  }
  public addTaskConf(conf: TaskHackConf) {
    this.taskHack.addConfig(conf);
  }
  protected defineApiProperty(): void {
    Object.defineProperty(env, 'connectSocket', {
      get: () => this.hackHandler.bind(this),
    });
  };

  private hackHandler(options: ConnectOption) {
    const opts = this.prefixHandler(options);
    const task = originConnect({
      ...opts,
      success: (res) => {
        this.successHandler(res, opts);
      },
      fail: (res) => {
        this.failHandler(res, opts);
      },
      complete: (res) => {
        this.completeHandler(res, opts);
      },
    });
    this.taskHack.toHack(task);
    return task;
  }
}


let hackWsConnect: HackWsConnect;

export const toHackWsConnect = function (option: HackWsConnectOpt) {
  const { connectCallback, taskOpt } = option;
  if (!hackWsConnect) {
    hackWsConnect = new HackWsConnect(connectCallback);
  } else {
    hackWsConnect.addCallback(connectCallback);
  }
  if (taskOpt) {
    hackWsConnect.addTaskConf(taskOpt);
  }
  return hackWsConnect;
};
