import { SendFail, SendOption, SendSuccess } from 'aegis-core';
// import HttpAgent from 'agentkeepalive';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { SelectorUpdateInfo } from '../selector/selector_base';
import { BaseProtocal, ProtocolOptions } from './protocol_base';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HttpAgent = require('agentkeepalive');

export default class HttpProtocal extends BaseProtocal {
  protected isHttps = false;
  protected agent: any;
  public constructor(options: ProtocolOptions) {
    super(options);
    if (this.protocol === 'https') {
      this.isHttps = true;
    }
    if (this.keepalive) {
      const agentOptions = {
        keepAlive: true,
        keepAliveMsecs: 2000,
        freeSocketTimeout: 5000,
        maxSockets: 20,
        maxFreeSockets: 10,
      };
      // eslint-disable-next-line max-len
      this.isHttps ? (this.agent = new  HttpAgent.HttpsAgent(agentOptions)) : (this.agent = new HttpAgent(agentOptions));
    }
  }
  public async send(
    options: SendOption,
    opt: { success?: SendSuccess; fail?: SendFail; bean?: string },
  ) {
    let { url } = options;
    const [selectorResp, err] = await this.selector.select(url);
    if (err) {
      console.error(`[service selector err] ${err.message}`);
      return;
    }
    if (!/^http[s]?:\/\//.test(selectorResp.url || '')) {
      url = `${this.isHttps ? 'https://' : 'http://'}${selectorResp.url}`;
    } else {
      // eslint-disable-next-line prefer-destructuring
      url = selectorResp.url as string;
    }
    // 当 options.addBean !== false 时默认带上 bean 中的参数
    if (options.addBean !== false && opt.bean) {
      url = `${url}${url.indexOf('?') === -1 ? '?' : '&'}${opt.bean}`;
    }

    // if (options.method === "post") {
    //   url += `&${options.data}`;
    // }
    const aegisXhrStartTime = Date.now();
    const reqOptions: AxiosRequestConfig = {
      url,
      method: 'post',
      data: options.data,
      timeout: 3e3,
    };
    if (this.agent) {
      this.isHttps ? (reqOptions.httpsAgent = this.agent) : (reqOptions.httpAgent = this.agent);
    }
    axios(reqOptions)
      .then((res: { data: any }) => {
        const updateInfo: SelectorUpdateInfo = {
          success: true,
          code: 0,
          cost: Date.now() - aegisXhrStartTime,
        };
        this.selector.update(selectorResp.ctx, updateInfo);
        opt.success?.(JSON.stringify(res.data));
      })
      .catch((e?: AxiosError) => {
        console.error(`[aegis server access err] url = ${url}; message = ${e?.message}`);
        if ((e?.request)?.reusedSocket && e.code === 'ECONNRESET') {
          console.error('[aegis connection retry] reason: connection reset on reused socket');
          this.send(options, opt);
          return;
        }
        const updateInfo: SelectorUpdateInfo = {
          success: false,
          code: -1,
          cost: Date.now() - aegisXhrStartTime,
        };
        this.selector.update(selectorResp.ctx, updateInfo);
        opt.fail?.(e);
      });
  }
}
