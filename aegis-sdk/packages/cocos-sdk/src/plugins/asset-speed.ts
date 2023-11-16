/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable func-style */
/* eslint-disable @typescript-eslint/unified-signatures */
import Core, {
  Plugin,
} from 'aegis-core';

interface EntryObj {
  url: string;
  startTime: number;
  asset: any;
  err: object;
}

type ResourcesType = string | string[] | { uuid?: string, url?: string, type?: string };

const oriRemote = cc.assetManager.loadRemote;
const oriLoad = cc.loader.load;
const oriLoadRes = cc.loader.loadRes;

export default new Plugin({
  name: 'reportAssetSpeed',

  isStart: false,

  onNewAegis(aegis) {
    if (this.isStart) return;
    this.isStart = true;
    this.start(aegis);
  },

  // 改写cocos的
  start() {
    this.hackLoad();
    this.hackLoadRes();
    this.hackLoadRemote();
  },

  // hack cc.loader.load方法
  hackLoad() {
    const self = this;
    function load(resources: ResourcesType, completeCallback?: Function): void;
    function load(resources: ResourcesType, progressCallback: (completedCount: number, totalCount: number, item: any)
    => void, completeCallback: Function | null): void;

    function load(...args: any[]) {
      if (args.length === 0) {
        console.error('no resource to load');
        return;
      }

      // eslint-disable-next-line prefer-destructuring
      const resources = args[0] as any;
      const onComplete = args.length > 1 ? args.pop() : null;

      let url = '';
      if (typeof resources === 'object' && resources.url) {
        // eslint-disable-next-line prefer-destructuring
        url = resources.url;
      } else if (typeof resources === 'string') {
        url = resources;
      }

      const startTime = Date.now();
      oriLoad.call(cc.loader, resources, (err: any, asset: any) => {
        self.publishAssetLog({
          url,
          startTime,
          asset,
          err,
        });
        if (onComplete) {
          onComplete(err, asset);
        }
      });
    }

    cc.loader.load = load;
  },

  // hack cc.loader.loadRes方法
  hackLoadRes() {
    const self = this;

    function loadRes(url: string,
      type: typeof cc.Asset,
      progressCallback: (completedCount: number, totalCount: number, item: any)
      => void, completeCallback: ((error: Error, resource: any) => void) | null): void;
    function loadRes(url: string,
      type: typeof cc.Asset,
      completeCallback: (error: Error, resource: any) => void): void;
    function loadRes(url: string, type: typeof cc.Asset): void;
    function loadRes(url: string,
      progressCallback: (completedCount: number, totalCount: number, item: any)
      => void, completeCallback: ((error: Error, resource: any) => void) | null): void;
    function loadRes(url: string, completeCallback: (error: Error, resource: any) => void): void;
    function loadRes(url: string): void;

    function loadRes(...args: any[]) {
      if (args.length === 0) {
        console.error('no resource to load');
        return;
      }

      const url = args[0] as string;
      const onComplete = args.length > 1 ? args.pop() : null;

      const startTime = Date.now();
      oriLoadRes.call(cc.loader, ...args, (err: any, asset: any) => {
        self.publishAssetLog({
          url,
          startTime,
          err,
          asset,
        });
        onComplete(err, asset);
      });
    };

    cc.loader.loadRes = loadRes;
  },

  // hack loadRemote方法
  hackLoadRemote() {
    const self = this;

    function loadRemote<T extends cc.Asset>(
      url: string, options: Record<string, any>,
      onComplete: (err: Error, asset: T) => void
    ): void;
    function loadRemote<T extends cc.Asset>(url: string, onComplete: (err: Error, asset: T) => void): void;
    function loadRemote(url: string, options: Record<string, any>): void;
    function loadRemote(url: string): void;

    function loadRemote(...args: any[]) {
      if (args.length === 0) {
        console.error('no resource to load');
        return;
      }

      // eslint-disable-next-line prefer-destructuring
      const url = args[0];
      const onComplete = args.length > 1 ? args.pop() : null;

      const startTime = Date.now();
      oriRemote.call(cc.assetManager, ...args, (err: any, asset: any) => {
        self.publishAssetLog({
          url,
          startTime,
          err,
          asset,
        });
        if (onComplete) {
          onComplete(err, asset);
        }
      });
    };

    cc.assetManager.loadRemote = loadRemote;
  },

  /**
 * 增加资源load次数
 * @param texture
 * @returns
 */
  addAssetsLoadTimes(texture: any) {
    if (!texture) {
      return;
    }

    texture.loadTimes = texture.loadTimes ? texture.loadTimes + 1 : 1;
  },

  generateLog(item: EntryObj) {
    return {
      url: item.url,
      method: 'get',
      duration: Date.now() - item.startTime,
      status: item.err ? 400 : 200,
      type: 'static',
      isHttps: true,
      urlQuery: '',
      domainLookup: 0,
      connectTime: 0,
    };
  },

  publishAssetLog(item: EntryObj) {
    if (!item.err) {
      this.addAssetsLoadTimes(item.asset);
    }

    this.$walk((aegis: Core) => {
      aegis.speedLogPipeline(this.generateLog(item));
    });
  },
});
