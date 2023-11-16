export type WsError = { readyState: number, msg: string, connectUrl: string };
type OnErr = ((e: Event) => void) | undefined;
type WsSend = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
type EmitError = (e: WsError) => void;

export type HackWsConfig = {
  // 配置唯一标志符
  key: string
  onErr: EmitError
  sendErr: EmitError
};
type HackWebsocket = WebSocket & { originOnErr: OnErr, originSend: WsSend, isHack: boolean };

const originWebsocket = window.WebSocket;
const configList: HackWsConfig[] = [];
// 配置列表

// 添加配置列表
const addConfig = (config: HackWsConfig) => {
  const target = configList.find(option => option.key === config.key);
  if (target) {
    // 同名key配置文件已经存在, 此处不应该报错，否则多实例aegis必然会触发
    return;
    // throw new Error(`key: '${target.key}' is already in HackWsConfig option list`);
  }
  if (config) {
    configList.push(config);
  }
};

// 卸载已有hack还原原始websocket
export const unHackWs = (conf: HackWsConfig) => {
  window.WebSocket = originWebsocket;
  const index = configList.findIndex(option => option.key === conf.key);
  if (index !== -1) {
    configList.splice(index, 1);
  }
};

/**
 * 拦截现有websocet对象，不使用继承的方式主要是由于代码会编译成es6以下的版本。继承的实现中会执行构造函数
 * 但是websocket为固有对象，无法使用执行语句故最终会报错。
**/
const wsHandler = {
  construct(Ws: typeof WebSocket, args: [string, string | string[] | undefined]) {
    const instance = new Ws(args[0], args[1]) as HackWebsocket;
    instance.originSend = instance.send;
    instance.addEventListener('error', (e) => {
      const { url, readyState } = e?.currentTarget || {} as any;
      // web的err事件仅能获取一个event对象且无具体错误信息，错误信息会直接打印在控制台上并且无法catch捕获
      configList?.forEach(({ onErr }) => {
        onErr?.({ msg: '无法获知具体错误信息，需在浏览器控制台查看！', readyState, connectUrl: url });
      });
    });
    Object.defineProperty(instance, 'send', {
      get: () => (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
        instance.originSend?.(data);
        // websocket send方法在方法内部就直接讲具体错误捕获console了。所以无法在外层捕获，目前可以根据当间连接状态进行上报。
        const { readyState } = instance;
        const { OPEN, CLOSED, CONNECTING, CLOSING } = WebSocket;
        // 连接状态正常
        if (readyState === OPEN) return;
        const baseInfo = { readyState, connectUrl: instance.url };
        // 发送时的连接状态异常进行上报
        switch (readyState) {
          case CLOSED:
            configList.forEach(({ sendErr }) => {
              sendErr?.({ msg: '消息发送失败，连接已关闭！', ...baseInfo });
            });
            break;
          case CONNECTING:
            configList.forEach(({ sendErr }) => {
              sendErr({ msg: '消息发送失败，正在连接中！', ...baseInfo });
            });
            break;
          case CLOSING:
            configList.forEach(({ sendErr }) => {
              sendErr({ msg: '消息发送失败，连接正在关闭！', ...baseInfo });
            });
            break;
          default:
            break;
        }
      },
    });
    return instance;
  },
};


const hackWebSocket = function (config: HackWsConfig) {
  // 兼容性处理，判断是否存在Proxy类，没有则不进操作
  if (!window.Proxy || !window.WebSocket) {
    return;
  }
  const nowWebSocket: HackWebsocket = window.WebSocket as unknown as HackWebsocket;
  if (window && !nowWebSocket.isHack) {
    const HackWebsocket = new Proxy(WebSocket, wsHandler);
    nowWebSocket.isHack = true;
    window.WebSocket = HackWebsocket;
  }
  addConfig(config);
};


export default hackWebSocket;
