import Core from './core';

type PluginConfig = boolean | any;
interface PluginOption<Aegis> {
  name: string;
  init?: (this: PluginOption<Aegis> & PluginMethod<Aegis>, config: PluginConfig) => void;
  onNewAegis?: (
    this: PluginOption<Aegis> & PluginMethod<Aegis>,
    aegis: Aegis,
    option: PluginConfig,
  ) => void;
  destroy?: Function;
  [key: string]: any;
}

interface PluginMethod<Aegis> {
  $walk: (cb: (aegis: Aegis, config: PluginConfig) => void) => void;
  $getConfig: (aegis: Aegis) => PluginConfig;
  [key: string]: any;
}

export default class Plugin<Aegis = Core> {
  // 插件标识符
  public aegisPlugin = true;
  public name = '';
  public option: PluginOption<Aegis>;
  private instances: Aegis[] = [];
  // 插件初始化flag
  private inited = false;

  public constructor(option: PluginOption<Aegis>) {
    option.$walk = this.walk.bind(this);
    option.$getConfig = this.getConfig.bind(this);
    this.option = option;
    this.name = option.name;
  }
  public patch(aegis: Aegis) {
    // 配置打开 && 不存在
    if (this.canUse(aegis) && this.exist(aegis)) {
      this.instances.push(aegis);
      this.triggerInit(aegis);
      this.triggerOnNewAegis(aegis);
    }
  }

  public unpatch(aegis: Aegis) {
    const index = this.instances.indexOf(aegis);
    if (index !== -1) {
      this.instances.splice(index, 1);
      this.instances.length === 0 && this.uninstall(aegis);
    }
  }

  public countInstance() {
    return this.instances.length;
  }

  // 子类要实现自身的卸载方法
  // 对于事件类处理函数的卸载，一般放lifeCycle的destroy事件中处理
  public uninstall(aegis: Aegis) {
    this.option?.destroy?.apply(this, [aegis]);
  }

  private walk(cb: (aegis: Aegis, config: PluginConfig) => void) {
    this.instances.forEach((instance) => {
      const config = this.canUse(instance);
      if (config) {
        cb(instance, config);
      }
    });
  }
  // 获取插件是否开启
  private canUse(aegis: Aegis): boolean {
    const config = this.getConfig(aegis);
    if (config && typeof config === 'object') {
      return true;
    }
    return !!config;
  }
  // 获取插件配置
  private getConfig(aegis: Aegis): PluginConfig {
    // @ts-ignore
    return aegis.config?.[this.name];
  }
  private exist(aegis: Aegis): boolean {
    return this.instances.indexOf(aegis) === -1;
  }
  private triggerInit(aegis: Aegis) {
    if (!this.inited) {
      this.inited = true;
      // 使用this.option作为调用，在插件中可以使用this来使用内部方法
      this.option?.init?.call(this.option, this.getConfig(aegis));
    }
  }
  private triggerOnNewAegis(aegis: Aegis) {
    this.option?.onNewAegis?.call(this.option, aegis, this.getConfig(aegis));
  }
}
