/* eslint-disable no-useless-constructor */
// 北极星 selector

import * as url from 'url';
import * as querystring from 'querystring';
import { SelectorConf } from '../interface/selector';
import {
  SelectorBase,
  SelectorResponse,
  SelectorTypeEnum,
  SelectorUpdateInfo,
} from './selector_base';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const polarisApi = require('@tencent/polaris');

interface PolarisInfo {
  namespace: string;
  service: string;
}
const { Consumer } = polarisApi;
export default class PolarisSelector extends SelectorBase {
  protected static consumer = new Consumer(
    {},
    {
      logVerbosity: 0,
    },
  );
  protected parsedUrl: url.UrlWithStringQuery;
  protected namespace = 'Production'; // 北极星名称空间
  protected logPolarisInfo: PolarisInfo;
  protected speedPolarisInfo: PolarisInfo;

  public constructor(selectorConf: SelectorConf) {
    super(selectorConf);
    const logBaseUrl = `polaris://${this.selectorConf.logBaseUrl || 'tam_log_svr?ns=Production'}`; // 日志上报默认l5
    const speedBaseUrl = `polaris://${
      this.selectorConf.speedBaseUrl || 'tam_speed_svr?ns=Production'
    }`; // 测速上报默认l5
    this.logPolarisInfo = this.parseUrlToPolarisInfo(logBaseUrl);
    this.speedPolarisInfo = this.parseUrlToPolarisInfo(speedBaseUrl);
  }
  public async select(originUrl: string): Promise<[SelectorResponse, Error | null]> {
    let polarisInfo: PolarisInfo;
    if (originUrl.indexOf(this.defaultSpeedBaseUrl) > -1) {
      polarisInfo = this.speedPolarisInfo;
    } else {
      polarisInfo = this.logPolarisInfo;
    }
    let response;
    try {
      response = await PolarisSelector.consumer.select(polarisInfo.namespace, polarisInfo.service);
    } catch (e) {
      return [null as any, new Error(`polaris exception with ${e.message}`)];
    }
    if (!response) {
      // @ts-ignore
      return [null, new Error('polaris select no response')];
    }
    const { instance } = response;
    const { host: ip, port } = instance;
    const host = `${ip}:${port}`;
    let url = this.replaceUrl(originUrl, `${host}/speed`, host);
    url = `http://${url}`;
    // @ts-ignore
    return [
      {
        type: SelectorTypeEnum.POLARIS,
        url,
        ctx: response,
      },
      null,
    ];
  }

  public update(ctx: any, meta: SelectorUpdateInfo): void {
    if (ctx && typeof ctx.update === 'function') {
      ctx.update(
        meta.success,
        meta.cost,
        typeof meta.code === 'number' ? meta.code.toString() : undefined,
      );
    }
  }
  protected parseUrlToPolarisInfo(u: string): PolarisInfo {
    const parsed = url.parse(u);
    const service = parsed.host as string;
    const query = querystring.parse(parsed.query || '');
    const info: PolarisInfo = {
      namespace: (query.ns as string) || '',
      service,
    };
    return info;
  }
}
