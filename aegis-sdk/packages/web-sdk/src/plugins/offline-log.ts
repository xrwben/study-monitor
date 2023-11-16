import Core, {
  Plugin,
  NormalLog,
  buildLogParam,
  LogType,
  stringifyPlus,
  Config,
  SendType,
} from 'aegis-core';
import Aegis, { WebConfig } from '../aegis';

let plugin = new Plugin({ name: 'offlineLog' });

const loadFlog = function (scriptUrl: string, config: WebConfig | Config) {
  let collect: any = [];
  let upload: any = null;
  let changeConfig: any = null;
  const changeCb = (config: WebConfig) => {
    changeConfig = config;
  };
  const collector = function (log: any) {
    collect = collect.concat(log);
  };
  const uploader = function (conds: any = {}, params: any = {}) {
    upload = { conds, params };
  };
  Aegis.useAsyncPlugin(scriptUrl, {
    exportsConstructor: 'Flog',
    onAegisInit: (aegis: Core) => {
      aegis.lifeCycle.on('beforeWrite', collector);
      aegis.lifeCycle.on('uploadLogs', uploader);
      aegis.lifeCycle.on('onConfigChange', changeCb);
    },
    onAegisInitAndPluginLoaded: (aegis: Aegis, ExportsConstructor: any) => {
      const { dbConfig = {}, url = Aegis.urls.aegisCollect, offlineLogExp = 3, id, uin } = config;
      aegis.lifeCycle?.remove('beforeWrite', collector);
      aegis.lifeCycle?.remove('uploadLogs', uploader);
      aegis.lifeCycle?.remove('onConfigChange', changeCb);
      const options = Object.assign(
        {
          lookupUrl: `${url}/offlineAuto?id=${id}`,
          // uploadUrl: `${url}/offlineLogV2`,
          preservedDay: offlineLogExp,
          id,
          uin,
          aid: aegis.bean?.aid || '',
          beforeRequest: aegis.config.beforeRequest,
          afterRequest: aegis.config.afterRequest,
        },
        dbConfig,
        { sessionId: Aegis.sessionID },
      );
      try {
        const flog = new ExportsConstructor(options);
        collect.forEach((e: NormalLog) => {
          flog.add({ ...e, level: e.level === LogType.INFO_ALL ? LogType.INFO : e.level });
        });
        aegis.lifeCycle?.on('beforeWrite', (logs: NormalLog[] = []) => {
          logs.forEach((e: NormalLog) => {
            flog.add({ ...e, level: e.level === LogType.INFO_ALL ? LogType.INFO : e.level });
          });
        });
        aegis.lifeCycle?.on('uploadLogs', (conds: any = {}, params: any = {}) => {
          flog.uploadLogs(
            Object.assign(
              {
                id: config.id,
                uin: config.uin,
                aid: aegis.bean?.aid,
              },
              conds,
            ),
            params,
          );
        });
        aegis.lifeCycle?.on('onConfigChange', (config: WebConfig) => {
          flog.setConfig(config);
        });
        aegis.lifeCycle?.on('destroy', () => {
          if (plugin.countInstance() === 0) {
            collect.length = 0;
            upload = null;
            typeof flog?.destroy === 'function' && flog.destroy();
          }
        });
        // persistance-error-event
        flog.on('PERREVENT', (err: any) => {
          aegis.sendPipeline([(log, resolve) => {
            const data = buildLogParam({ msg: stringifyPlus(log), level: LogType.INFO });
            resolve({
              type: SendType.OFFLINE,
              data,
              contentType: 'application/x-www-form-urlencoded',
              method: 'post',
              addBean: false,
              url: `${config.url}?id=893&sessionId=${Aegis.sessionID}&uin=${config.uin}&from=${config.id}&count=1&version=${VERSION}`,
              log,
            });
          }], SendType.OFFLINE)(err);
        });
        if (changeConfig) {
          flog.setConfig(changeConfig);
          changeConfig = null;
        }
        if (upload) {
          aegis.lifeCycle?.emit('uploadLogs', upload.conds, upload.params);
          upload = null;
        }
        // @ts-ignore
        aegis.flog = flog; // 将flog对用户公开，让用户可以自由操作离线日志
      } catch (e) {
        console.log(e);
      }
    },
  });
};

if (OFFLINE_LOG) {
  plugin = new Plugin({
    name: 'offlineLog',
    onNewAegis(aegis) {
      loadFlog(Aegis.urls.flog, aegis.config);
    },
  });
}

export default plugin;
