/* eslint-disable no-useless-constructor */
import { SelectorConf } from '../interface/selector';

export enum SelectorTypeEnum {
  IP,
  HOST,
  L5,
  POLARIS,
}
export interface SelectorResponse {
  url?: string;
  type?: SelectorTypeEnum;
  ctx?: any;
}
export interface SelectorUpdateInfo {
  success: boolean;
  cost?: number; // 耗时，秒为单位
  code?: number; // 返回码
}
export type SelectorClassType = new (selectorConf: SelectorConf) => SelectorBase;
export abstract class SelectorBase {
  protected defaultSpeedBaseUrl = 'aegis.qq.com/speed';
  protected defaultLogBaseurl = 'aegis.qq.com';
  public constructor(public selectorConf: SelectorConf) {}
  protected replaceUrl(originUrl: string, speedBaseUrl: string, logBaseUrl: string): string {
    const url = originUrl
      .replace(/(^http[s]?:\/\/)?/, '')
      .replace(
        this.defaultSpeedBaseUrl, // 先解析测速
        speedBaseUrl,
      )
      .replace(
        this.defaultLogBaseurl, // 再解析日志
        logBaseUrl,
      );
    return url;
  }
  abstract select(originUrl: string): Promise<[SelectorResponse, Error | null]>;
  abstract update(ctx: any, meta: SelectorUpdateInfo): void;
}
