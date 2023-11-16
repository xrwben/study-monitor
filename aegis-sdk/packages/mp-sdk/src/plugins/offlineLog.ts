import { Plugin, NormalLog, LogType, Config, SendType } from 'aegis-core';
import { env } from '../adaptor';
import { getCurrPageUrl, extend } from '../util/index';
import { MpConfig } from '../aegis';

export interface ErrorMsg {
  msg: string;
  rowNum: string;
  colNum: string;
  target: string;
  level: LogType;
  from: string;
  id?: string;
  time?: number;
  uin?: string | number;
  version?: string;
}

export interface LogConfig {
  uin: number | string;
  id: number | string;
}

export const offlineLogPlugin = new Plugin({
  name: 'offlineLog',
  onNewAegis(aegis) {
    if (!env.getFileSystemManager) {
      console.warn('[aegis-mp-sdk]unsupport getFileSystemManager offline log not work!');
      return;
    }

    try {
      const { id = '', uin = 0, offlineUrl = '', offlineLogLimit } = aegis.config as any;

      const offlineLog = new OfflineLog({ limit: offlineLogLimit });
      aegis.lifeCycle.on('beforeWrite', (logs: NormalLog[] = []) => {
        offlineLog.save2Offline(logs, aegis.config);
      });

      offlineLog.ready((err: Error) => {
        const { aid = '' } = aegis.bean || {};
        if (err || !id || (!uin && !aid)) return;

        aegis.send(
          {
            url: `${offlineUrl}/offlineAuto`,
            type: SendType.OFFLINE,
            log: SendType.OFFLINE,
          },
          (res: any) => {
            const { secretKey } = res?.data;

            if (secretKey) {
              if (err) return;

              offlineLog.getLogs({ id, uin }, (err: any, logs: any) => {
                if (err) {
                  console.error(err);
                  return;
                }

                aegis.send(
                  {
                    url: `${offlineUrl}/offlineLog`,
                    data: { logs, secretKey, id, uin, aid },
                    method: 'post',
                    type: SendType.OFFLINE,
                    log: logs,
                  },
                  () => {
                    offlineLog.clearLogs();
                  },
                );
              });
            }
          },
        );
      });
    } catch (e) {
      console.error(e);
    }
  },
});

/**
 * 封装对 文件 的读写操作
 */
class OfflineLog {
  public fileSystem: WechatMiniprogram.FileSystemManager;
  public offlineLog?: boolean;
  public limitSize: number;
  public offlineBuffer: ErrorMsg[] = [];
  private filePath: string;
  private insertLog = (() => {
    let timer: any = null;
    let logs: any = [];

    return (log: any) => {
      logs = logs.concat(log);

      if (!timer) {
        timer = setTimeout(() => {
          const { fileSystem, filePath } = this;

          const msgString = `${logs.map((item: any) => JSON.stringify(item)).join('\n')}\n`;
          if (msgString) {
            const appendFile = (exit?: boolean) => {
              exit
                ? this.checkLimit(msgString, () => {
                  logs = [];
                })
                : fileSystem.writeFile({
                  data: msgString,
                  filePath,
                  encoding: 'utf8',
                  fail(err: any) {
                    console.error(err);
                  },
                  success() {
                    logs = [];
                  },
                });
            };

            fileSystem.access({
              path: filePath,
              success() {
                appendFile(true);
              },
              fail() {
                appendFile();
              },
            });
          }
          clearTimeout(timer);
          timer = null;
        }, 2000);
      }
    };
  })();
  public constructor({ path = '/.aegis.offline.log', limit = 20000 } = {}) {
    this.filePath = (env as any).env.USER_DATA_PATH + path;
    this.fileSystem = env.getFileSystemManager();
    this.limitSize = limit;
  }

  // getStore = () => {
  //   // const transaction = this.fileSystem.transaction('logs', 'readwrite');
  //   // return transaction.objectStore('logs');
  // }

  public ready = (callback: Function) => {
    if (this.fileSystem) {
      setTimeout(() => {
        callback(null);
      }, 0);

      return;
    }
    callback(new Error('getFileSystemManager file'));
    this.offlineLog = false;
  };

  public clearLogs = () => {
    // 清除日志文件
    const { fileSystem, filePath } = this;

    fileSystem.writeFile({
      filePath,
      data: '',
      fail() {
        fileSystem.unlinkSync(filePath);
      },
    });
  };

  public save2Offline = (_msgObj: NormalLog | NormalLog[], config: MpConfig | Config) => {
    if (!Array.isArray(_msgObj)) {
      _msgObj = [_msgObj];
    }
    const msgObj = _msgObj.map((msg) => {
      if (typeof msg === 'string') {
        msg = { msg } as any;
      }

      return extend(
        {
          id: config.id,
          uin: config.uin,
          time: Date.now() - 0,
          version: config.version,
          from: getCurrPageUrl(config),
        },
        msg,
      ) as ErrorMsg;
    });

    if (this.fileSystem) {
      this.insertLog(msgObj);
      return;
    }

    if (!this.fileSystem && !this.offlineBuffer.length) {
      this.ready((err: any) => {
        if (err) {
          console.error(err);
          return;
        }

        if (this.offlineBuffer.length) {
          this.addLogs(this.offlineBuffer);
          this.offlineBuffer = [];
        }
      });
    }

    this.offlineBuffer = this.offlineBuffer.concat(msgObj);
  };

  /**
   * 过滤出日期和id还有uid相符合的日志信息
   * @param opt
   * @param callback
   */
  public getLogs(opt: LogConfig, callback: Function) {
    const { fileSystem, filePath } = this;

    fileSystem.readFile({
      filePath,
      encoding: 'utf8',
      fail(err) {
        console.error(err);
      },
      success: ({ data = '' }) => {
        const logs = data
          .toString()
          .split('\n')
          .filter(str => str)
          .map(str => JSON.parse(str)) as ErrorMsg[];

        callback(null, logs);
      },
    });
  }

  private checkLimit(
    msgString: string,
    callback: any = () => {
      /* empty */
    },
  ) {
    const { fileSystem, filePath, limitSize } = this;

    fileSystem.readFile({
      filePath,
      encoding: 'utf8',
      success({ data = '' }) {
        data = data.toString() + msgString;

        if (data.length > limitSize) {
          const logs = data.split('\n');

          let filterData = '';
          for (let i = logs.length - 1; i >= 0; i--) {
            if (!logs[i]) continue;
            filterData = `${logs[i]}\n${filterData}`;

            if (filterData.length > limitSize) {
              break;
            }
          }

          fileSystem.writeFile({
            filePath,
            data: filterData,
            success: callback,
          });
        } else {
          fileSystem.appendFile({
            data: msgString,
            filePath,
            encoding: 'utf8',
            success: callback,
            fail(err: any) {
              console.error(err);
            },
          });
        }
      },
    });
  }

  private addLogs = (logs: any) => {
    if (!this.fileSystem) {
      return;
    }

    this.insertLog(logs);
  };
}
