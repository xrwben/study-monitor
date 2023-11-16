import { SelectorBase, SelectorResponse, SelectorTypeEnum } from './selector_base';
import * as url from 'url';
import { SelectorConf } from '../interface/selector';

export default class IPSelector extends SelectorBase {
  protected parsedUrl: url.UrlWithStringQuery;
  public constructor(selectorConf: SelectorConf) {
    super(selectorConf);
    if (this.selectorConf.type === 'host') {
      this.selectorConf.logBaseUrl = this.selectorConf.logBaseUrl || this.defaultLogBaseurl;
      this.selectorConf.speedBaseUrl = this.selectorConf.speedBaseUrl || this.defaultSpeedBaseUrl;
    } else if (this.selectorConf.type === 'ip') {
      if (!this.selectorConf.logBaseUrl || !this.selectorConf.speedBaseUrl) {
        throw new Error('logBaseUrl or speedBaseUrl required');
      }
    }
    // this.parsedUrl = url.parse(baseUrl);
    // if (!this.parsedUrl.port) throw new Error('port must provide');
  }
  public select(originUrl: string): Promise<[SelectorResponse, Error | null]> {
    let type: SelectorTypeEnum = null as any;
    if (this.selectorConf.type === 'host') {
      type = SelectorTypeEnum.HOST;
    } else if (this.selectorConf.type === 'ip') {
      type = SelectorTypeEnum.IP;
    }
    const url = this.replaceUrl(
      originUrl,
      this.selectorConf.speedBaseUrl as string,
      this.selectorConf.logBaseUrl as string,
    );
    // @ts-ignore
    return Promise.resolve([
      {
        type,
        url,
        ctx: null,
      },
      null,
    ]);
  }
  public update(): void {
    /* ip selector do not need update */
  }
}
