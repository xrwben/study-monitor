/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import Core, { Plugin, SendType, createPipeline, createThrottlePipe, NormalLog, LogType } from 'aegis-core';
import Aegis, { MpConfig } from '../aegis';
import { wxCanIUse } from '../util/wxApi';
import { env } from '../adaptor';
import {
  PagePerformanceLog,
  AppLaunchPerformanceLog,
  PageFirstRenderPerformanceLog,
  EvaluateScriptPerformanceLog,
  PageRoutePerformanceLog,
  UpdatePerformanceResult,
} from '../interface';
import {
  getDataSize,
} from '../util';

interface AppRouteParam {
  openType: string;
  path: string;
}

interface SetDataTimingItem {
  duration: number;
  from: string;
  dataPaths?: (string | number)[][];
  size?: number;
}

const APP_LAUNCH = 'appLaunch';
const FIRST_RENDER = 'firstRender';
const EVALUATE_SCRIPT = 'evaluateScript';
const PAGE_ROUTE = 'route';
const FIRST_PAINT = 'firstPaint';
const LIFE_CYCLE_FUNC_NAME = ['onLaunch', 'onHide', 'onError', 'onLoad', 'onReady', 'onShow', 'onUnload'];
const TAP_EVENT = 'tap';
const FUNC_TYPE = 'function';
const OBJECT_TYPE = '[object Object]';

// setData耗时上报默认时间阈值，默认只上报更新耗时大于30ms的数据
const SET_DATA_DEFAULT_TIME_THRESHOLD = 30;

const plugin = new Plugin({
  name: 'pagePerformance',

  pageNavigationStartTime: {}, // 计算首屏时间 route 和 firstPaint 可能不在同时触发，需要保存下起点时间

  onNewAegis(aegis: Aegis) {
    if (!PAGE_PERFORMANCE) return;
    try {
      if (wxCanIUse('getPerformance')) {
        this.reportPerformance(aegis);
      }
      this.setPagePV(aegis);
      this.reportSetDataTiming(aegis);
    } catch (e) { }
  },

  // 上报页面性能数据
  reportPerformance(aegis: Aegis) {
    const performance = env.getPerformance() as any;
    const observer = performance?.createObserver((entryList: WechatMiniprogram.Performance) => {
      const result = {} as AppLaunchPerformanceLog
      & PageFirstRenderPerformanceLog
      & EvaluateScriptPerformanceLog
      & PageRoutePerformanceLog;


      // 循环优化，使用 微信小程序提供的 getEntriesByName 方法，兼容性和 getPerformance 一致
      // entry.duration会出现负数的情况，官方还未给出方案
      const appLaunchPerf = entryList.getEntriesByName(APP_LAUNCH)?.[0];
      const pageFirstRenderPerf = entryList.getEntriesByName(FIRST_RENDER)?.[0];
      const scriptEvaluatePerf = entryList.getEntriesByName(EVALUATE_SCRIPT)?.[0];
      const pageRoutePerf = entryList.getEntriesByName(PAGE_ROUTE)?.[0];
      const firstPaintStartTime = entryList.getEntriesByName(FIRST_PAINT)?.[0]?.startTime;
      const pageId = (entryList.getEntriesByName(FIRST_PAINT)?.[0]
        || entryList.getEntriesByName(PAGE_ROUTE)?.[0]
        || entryList.getEntriesByName(APP_LAUNCH)?.[0])?.pageId;
      const navigationStartTime = (entryList.getEntriesByName(PAGE_ROUTE)?.[0]
        || entryList.getEntriesByName(APP_LAUNCH)?.[0])?.startTime;
      if (pageId) {
        this.pageNavigationStartTime[pageId] = null;
        if (navigationStartTime) {
          this.pageNavigationStartTime[pageId] = navigationStartTime;
        }
      }

      if (appLaunchPerf) {
        result.appLaunch = appLaunchPerf.duration || -1;
      }
      if (pageFirstRenderPerf) {
        result.firstScreenTiming = pageFirstRenderPerf.duration || -1;
      }
      if (scriptEvaluatePerf) {
        result.scriptEvaluateTiming = scriptEvaluatePerf.duration || -1;
      }
      if (pageRoutePerf) {
        result.pageRouteTiming = pageRoutePerf.duration || -1;
      }
      if (firstPaintStartTime && navigationStartTime) {
        // 根据 firstPaint的时间点减去路由开始的时间点可以得到首屏渲染时间
        // firstPaint 和 route 同时触发的场景
        result.firstPaintTiming = Math.max(firstPaintStartTime - navigationStartTime, -1);
      } else if (firstPaintStartTime && this.pageNavigationStartTime[pageId]) {
        // 计算首屏时间时firstRender 和 route 可能不在同时触发
        result.firstPaintTiming = Math.max(firstPaintStartTime - this.pageNavigationStartTime[pageId], -1);
      }
      if (Object.keys(result).length > 0) {
        this.publish(result, aegis);
      }
    });
    observer?.observe({ entryTypes: ['navigation', 'render', 'script'] });
  },

  publish(log: PagePerformanceLog, instance: Aegis) {
    const param: string[] = [];
    const pluginConfig: MpConfig = instance.config as MpConfig;

    const splitSymbol = instance.config.performanceUrl?.indexOf('?') === -1 ? '?' : '&';

    for (const key in log) {
      param.push(`${key}=${log[key]}`);
    }

    if (typeof pluginConfig.urlHandler === 'function') {
      const url = pluginConfig.urlHandler() || window.location.href;
      this.$walk((aegis: Aegis) => {
        aegis.send({
          url: `${instance.config.performanceUrl}${splitSymbol}${param.join('&')}&from=${encodeURIComponent(url)}`,
          beanFilter: ['from'],
          type: SendType.PERFORMANCE,
          log,
        });
      });
    } else {
      this.$walk(((aegis: Aegis) => {
        aegis.send({
          url: `${instance.config.performanceUrl}${splitSymbol}${param.join('&')}`,
          type: SendType.PERFORMANCE,
          log,
        });
      }));
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setPagePV(_aegis: Aegis) {
    // onAppRoute为小程序未公开在mp的函数,不能直接用canIUse判断
    if (!(env as any).onAppRoute) {
      return;
    }
    (env as any).onAppRoute((res: AppRouteParam) => {
      // 首页访问不上报，避免重复上报pv
      if (res.openType === 'appLaunch' && !_aegis.config.spa) {
        return;
      }

      this.$walk((aegis: Aegis) => {
        aegis.send({
          url: `${aegis.config.pvUrl}`,
          type: SendType.PV,
        });
      });
      // 用户行为回溯之页面加载，页面跳转等信息
      this.reportPageLoaded(res);
    });
  },

  reportPageLoaded(res: AppRouteParam) {
    const msg = `infoType: behaviorBacktracking\ndataType: pageLoadAndRoute\npageLoadedPath: ${res.path}\nopenType: ${res.openType}`;
    this.publishNormalLog({
      msg,
      level: LogType.INFO, // 白名单
    });
  },

  publishNormalLog(log: NormalLog) {
    this.$walk((aegis: Core) => {
      aegis.normalLogPipeline(log);
    });
  },

  reportSetDataTiming(aegis: Aegis) {
    const pluginConfig: MpConfig = aegis.config as MpConfig;

    const { setDataReportConfig = {} } = pluginConfig;

    if (setDataReportConfig.disabled === true) {
      return;
    }

    const { timeThreshold } = setDataReportConfig;
    const withDataPaths = setDataReportConfig.withDataPaths !== false;

    // `timeThreshold` 配置为大于0的数字时生效
    const threshold = timeThreshold && +timeThreshold > 0
      ? +timeThreshold
      : SET_DATA_DEFAULT_TIME_THRESHOLD;

    const throttlePublish = createPipeline([
      // 节流，10条数据聚合后才上报一次
      createThrottlePipe(aegis, 10),
      (logs) => {
        const formatLogs = logs.map((item: SetDataTimingItem) => ({
          type: SendType.SET_DATA,
          component: item.from,
          duration: item.duration,
          fields: item.dataPaths && item.dataPaths.length ? item.dataPaths.sort().join(';') : undefined,
          size: item.size,
        }));
        aegis.send({
          url: `${aegis.config.setDataReportUrl}?payload=${encodeURIComponent(JSON.stringify({ miniProgramData: formatLogs }))}`,
          type: SendType.SET_DATA,
          log: formatLogs,
        });
      },
    ]);

    const originPage: WechatMiniprogram.Page.Constructor = Page;
    const originComponent: WechatMiniprogram.Component.Constructor = Component;

    const handleUpdatePerformanceResult = (instance: any, res: UpdatePerformanceResult) => {
      const { updateStartTimestamp, updateEndTimestamp, dataPaths = [] as (string | number)[][] } = res;
      const cost = updateEndTimestamp - updateStartTimestamp;
      if (isNaN(cost) || cost < threshold) {
        return;
      }
      const data: SetDataTimingItem = { from: instance.is, duration: cost };

      if (withDataPaths && dataPaths.length > 0) {
        Object.assign(data, {
          // 更新的字段中包含数组时，微信api返回的 dataPaths 数据量可能很大（按数组索引返回每一项），此时上报数据量超出GET请求URI限度会失败
          // 此处先简单处理截取前30个字段
          dataPaths: dataPaths.slice(0, 30),
          size: getDataSize(instance, dataPaths),
        });
      }

      throttlePublish(data);
    };

    const reportTapEventInfo = (args: any[]) => {
      const msgStr = Object.keys(args[0]).reduce((res, cur) => {
        let str = '';
        try {
          str = `${cur}: ${JSON.stringify(args[0][cur])}`;
        } catch (e) {
          str = '';
        }
        res += `\n${str}`;
        return res;
      }, '');
      const msg = `infoType: behaviorBacktracking\ndataType: tapEvent${msgStr}`;
      this.publishNormalLog({
        msg,
        level: LogType.INFO, // 白名单
      });
    };

    // 重写Page方法，上报setData耗时
    Page = (pageOptions:
    WechatMiniprogram.Page.Options<WechatMiniprogram.Page.DataOption, WechatMiniprogram.Page.CustomOption>) => {
      const originalOnReady = pageOptions.onReady as () => void;
      pageOptions.onReady = function () {
        if (typeof this.setUpdatePerformanceListener === FUNC_TYPE) {
          this.setUpdatePerformanceListener({ withDataPaths }, (res: UpdatePerformanceResult) => {
            handleUpdatePerformanceResult(this, res);
          });
        }
        return originalOnReady?.call(this);
      };
      // hook page 里面的方法，通过判断事件传输type为tap作为点击事件的上报
      Object.keys(pageOptions).forEach((item: string) => {
        if (typeof pageOptions[item] === FUNC_TYPE && !LIFE_CYCLE_FUNC_NAME.includes(item)) {
          const originFunc = pageOptions[item];
          pageOptions[item] = function (...args: any[]) {
            if (args?.[0] && args[0].type === TAP_EVENT) {
              reportTapEventInfo(args);
            }
            return originFunc?.apply(this, args);
          };
        };
      });
      return originPage(pageOptions);
    };

    // 重写Component方法，上报setData耗时
    Component = (compOptions: WechatMiniprogram.Component.Options<
    WechatMiniprogram.Component.DataOption,
    WechatMiniprogram.Component.PropertyOption,
    WechatMiniprogram.Component.MethodOption,
    WechatMiniprogram.IAnyObject
    >) => {
      // 兼容组件生命周期置于`lifetimes`中的写法
      if (compOptions.lifetimes && compOptions.lifetimes.attached) {
        const originalAttached = compOptions.lifetimes.attached as () => void;
        compOptions.lifetimes.attached = function () {
          if (typeof (this as any).setUpdatePerformanceListener === FUNC_TYPE) {
            (this as any).setUpdatePerformanceListener({ withDataPaths }, (res: UpdatePerformanceResult) => {
              handleUpdatePerformanceResult(this, res);
            });
          }
          return originalAttached?.call(this);
        };
      } else {
        const originalAttached = compOptions.attached as () => void;
        compOptions.attached = function () {
          if (typeof (this as any).setUpdatePerformanceListener === FUNC_TYPE) {
            (this as any).setUpdatePerformanceListener({ withDataPaths }, (res: UpdatePerformanceResult) => {
              handleUpdatePerformanceResult(this, res);
            });
          }
          return originalAttached?.call(this);
        };
      }
      // hook component 里面的方法，通过判断事件传输type为tap作为点击事件的上报
      const { methods: compMethods } = compOptions;
      if (compMethods && Object.prototype.toString.call(compMethods) === OBJECT_TYPE) {
        Object.keys(compMethods).forEach((item: string) => {
          if (typeof compMethods[item] === FUNC_TYPE) {
            // methods 里面都是方法，不需要判断生命周期函数
            const originFunc = compMethods[item];
            compMethods[item] = function (...args: any[]) {
              if (args?.[0] && args[0].type === TAP_EVENT) {
                reportTapEventInfo(args);
              }
              return originFunc?.apply(this, args);
            };
          };
        });
      }
      return originComponent(compOptions);
    };
  },
});

export default plugin;
