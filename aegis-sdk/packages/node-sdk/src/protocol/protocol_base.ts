import { SelectorBase } from '../selector/selector_base';
import { Config, SendOption, SendSuccess, SendFail } from 'aegis-core';

export interface ProtocolOptions extends Pick<Config, 'protocol'> {
  selector: SelectorBase;
  keepalive: boolean;
}
export type ProtocalClassType = new (options: ProtocolOptions) => BaseProtocal;
export abstract class BaseProtocal {
  protected selector: SelectorBase;
  protected protocol: Config['protocol'];
  protected keepalive = false;
  public constructor(options: ProtocolOptions) {
    this.selector = options.selector;
    this.protocol = options.protocol;
    this.keepalive = options.keepalive;
  }
  abstract send(
    options: SendOption,
    opt: { success?: SendSuccess; fail?: SendFail; bean?: string },
  ): void;
}
