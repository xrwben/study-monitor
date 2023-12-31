/**
 * 已知 wx.request 请求错误类型
 *
 * request:fail interrupted 中断（例切小程序至后台）
 * request:fail -105:net::ERR_NAME_NOT_RESOLVED dns寻址前发现的错误，有可能网络未连接
 * request:fail -101:net::ERR_CONNECTION_RESET 重置连接，有可能是代理问题
 * request:fail -103:net::ERR_CONNECTION_ABORTED 未接收到所发送数据的ACK
 * request:fail -109:net::ERR_ADDRESS_UNREACHABLE IP地址不可达。这通常意味着没有通往指定的主机或网络
 * request:fail net::ERR_PROXY_CONNECTION_FAILED 代理问题（暂未屏蔽）
 * request:fail net::ERR_CONNECTION_TIMED_OUT
 * request:fail net::ERR_TIMED_OUT
 * request:fail timeout
 * request:fail 请求超时
 */

/**
* 是否请求超时错误
*/
export const isWxRequestTimeoutError = (msg: string) => [
  'timeout',
  'time out',
  'ERR_CONNECTION_TIMED_OUT',
  'ERR_TIMED_OUT',
  '超时',
].some(item => String(msg || '').includes(item));
