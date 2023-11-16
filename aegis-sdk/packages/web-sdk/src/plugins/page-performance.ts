/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/prefer-for-of */
import Core, {
  Plugin,
  PagePerformanceLog,
  SendType,
} from 'aegis-core';
import Aegis from '../aegis';
import { canUseResourceTiming } from '../util';

interface Change {
  roots: Element[];
  rootsDomNum: number[];
  time: number;
}

let plugin = new Plugin({ name: 'pagePerformance' });

const MAX_PERF_NUM = 30000;

// 限制性能数据在一定的范围内，排除异常数据
const limitPerformanceNumber = function (
  performanceValue: number,
  min = 0,
  max = MAX_PERF_NUM,
  defaultValue = 0
) {
  if (performanceValue >= min && performanceValue <= max) {
    return performanceValue;
  }
  return defaultValue;
};


// 页面测速重试次数
let retryTimes = 3;

if (PAGE_PERFORMANCE) {
  let result: PagePerformanceLog;

  plugin = new Plugin({
    name: 'pagePerformance',
    onNewAegis(aegis: Aegis) {
      if (!canUseResourceTiming()) return;
      if (result) {
        this.publish(result, aegis);
      } else {
        this.startCalcPerformance(aegis);
      }
    },
    publish(log: PagePerformanceLog, instance: Core) {
      this.$walk((aegis: Aegis) => {
        if (aegis !== instance) return;
        aegis.sendPipeline([
          (log: PagePerformanceLog, resolve: any) => {
            const param: string[] = [];
            for (const key in log) {
              param.push(`${key}=${log[key]}`);
            }
            const pluginConfig = this.$getConfig(aegis);
            if (!pluginConfig) {
              return;
            }
            // aegis/issue/issues/242
            const splitSymbol = aegis.config.performanceUrl?.indexOf('?') === -1 ? '?' : '&';
            if (typeof pluginConfig.urlHandler === 'function') {
              return resolve({
                url: `${aegis.config.performanceUrl}${splitSymbol}${param.join('&')}&from=${encodeURIComponent(pluginConfig.urlHandler()) || window.location.href
                }`,
                beanFilter: ['from'],
                type: SendType.PERFORMANCE,
                log,
              });
            }
            return resolve({
              url: `${aegis.config.performanceUrl}${splitSymbol}${param.join('&')}`,
              type: SendType.PERFORMANCE,
              log,
            });
          },
        ], SendType.PERFORMANCE)(log);
      });
    },
    startCalcPerformance(aegis: Aegis) {
      try {
        this.getFirstScreenTiming(aegis, (firstScreenTiming: number) => {
          const t: PerformanceTiming = performance.timing;
          if (!t) return;
          result = {
            dnsLookup: limitPerformanceNumber(t.domainLookupEnd - t.domainLookupStart),
            tcp: limitPerformanceNumber(t.connectEnd - t.connectStart),
            ssl: limitPerformanceNumber(t.secureConnectionStart === 0 ? 0 : t.requestStart - t.secureConnectionStart),
            ttfb: limitPerformanceNumber(t.responseStart - t.requestStart),
            contentDownload: limitPerformanceNumber(t.responseEnd - t.responseStart),
            domParse: limitPerformanceNumber(t.domInteractive - t.domLoading, 0, MAX_PERF_NUM, 1070),
            resourceDownload: limitPerformanceNumber(t.loadEventStart - t.domInteractive, 0, MAX_PERF_NUM, 1070),
            firstScreenTiming: limitPerformanceNumber(Math.floor(firstScreenTiming), 0, 60000),
          };

          const { config } = aegis;

          // @ts-ignore
          if (config.extraPerformanceData && JSON.stringify(config.extraPerformanceData) !== '{}') {
            // @ts-ignore
            const { engineInit, bundleLoad } = config.extraPerformanceData;
            result = {
              ...result,
              engineInit: limitPerformanceNumber(engineInit, 0, 10000),
              bundleLoad: limitPerformanceNumber(bundleLoad, 0, 10000),
            };
          }
          this.publish(result, aegis);
        });
      } catch (e) { }
    },
    getFirstScreenTiming(aegis: Aegis, callback: Function) {
      if (!IS_IE) {
        let timeout: any;
        aegis.lifeCycle.on('destroy', () => {
          timeout && clearTimeout(timeout);
        });

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        const ignoreEleList: string[] = ['script', 'style', 'link', 'br'];
        const changeList: Change[] = [];
        const markDoms: { [timing: number]: Element[]; } = {};

        const observeDom: MutationObserver = new MutationObserver((mutations) => {
          // 由于一次“MutationObserver”回调函数包含了多个“mutaion”，多个“mutation”可能修改了同一个dom节点，
          // 如果不聚合直接算dom节点数量的话，将重复计算
          const change: Change = {
            roots: [],
            rootsDomNum: [],
            time: performance.now(),
          };

          mutations.forEach((mutation) => {
            if (!mutation || !mutation.addedNodes || !mutation.addedNodes.forEach) return;

            mutation.addedNodes.forEach((ele) => {
              if (ele.nodeType === 1 && (
                (ele as Element).hasAttribute('AEGIS-FIRST-SCREEN-TIMING')
              )
              ) {
                if (!Object.prototype.hasOwnProperty.apply(markDoms, [change.time])) {
                  markDoms[change.time] = [];
                }
                markDoms[change.time].push(ele as Element);
              } else if (
                ele.nodeType === 1
                && ignoreEleList.indexOf(ele.nodeName.toLocaleLowerCase()) === -1
                && !self.isEleInArray(ele as Element, change.roots)
                && !(ele as Element).hasAttribute('AEGIS-IGNORE-FIRST-SCREEN-TIMING')
              ) {
                change.roots.push(ele as Element);
                change.rootsDomNum.push(self.walkAndCount(ele as Element) || 0);
              }
            });
          });

          change.roots.length && changeList.push(change);
        });

        observeDom.observe(document, { childList: true, subtree: true });

        const getTiming = (firstScreenTiming = 0) => {
          if (!firstScreenTiming) {
            let maxChange = 0;
            const markDomTimings = Object.keys(markDoms);
            //   .filter(timing => markDoms[+timing].find(ele => self.isInFirstScreen(ele)));

            if (markDomTimings.length) {
              // 用户手动标记的需要检查首屏的dom最晚出现的时间
              firstScreenTiming = Math.max.apply(null, markDomTimings);
              if (typeof aegis.config?.pagePerformance !== 'object' || aegis.config.pagePerformance?.firstScreenInfo) {
                aegis.firstScreenInfo = {
                  element: markDoms[firstScreenTiming]?.[0],
                  timing: firstScreenTiming,
                  markDoms,
                };
              }
            } else {
              changeList.forEach((change: Change) => {
                for (let i = 0; i < change.roots.length; i++) {
                  if (change.rootsDomNum[i] > maxChange && self.isInFirstScreen(change.roots[i])) {
                    maxChange = change.rootsDomNum[i];
                    firstScreenTiming = change.time;
                    if (typeof aegis.config?.pagePerformance !== 'object' || aegis.config.pagePerformance?.firstScreenInfo) {
                      aegis.firstScreenInfo = {
                        element: change.roots[i],
                        timing: firstScreenTiming,
                      };
                    }
                  }
                }
              });
            }
            // 解决内存泄漏问题
            changeList.length = 0;
            Object.keys(markDoms).forEach((timing) => {
              // @ts-ignorets
              markDoms[timing] = markDoms[timing].map((element) => {
                // 为了降低内存占用，只返回包含所有属性的对象，而不是整个 dom 对象
                const domObj: { [key: string]: string } = { tagName: element.tagName };
                const { attributes } = element;

                // 解决多个aegis实例时重复调用问题
                if (!attributes) return element;

                for (let i = 0; i < attributes.length; i++) {
                  const attribute = attributes[i];
                  if (attribute.name) domObj[attribute.name] = element.getAttribute(attribute.name);
                }
                return domObj;
              });
            });
          }

          const t: PerformanceTiming = performance.timing;
          const domParse = t.domInteractive - t.domLoading;
          const resourceDownload = t.loadEventStart - t.domInteractive;
          const firstScreen = firstScreenTiming;
          const timeList = [domParse, resourceDownload, firstScreen];
          timeout = null;
          for (const time of timeList) {
            if (time <= 0 && retryTimes > 0) {
              timeout = setTimeout(() => getTiming(firstScreen), 3000);
              break;
            }
          }
          if (timeout) {
            retryTimes -= 1;
          } else {
            observeDom.disconnect();
            callback?.(firstScreenTiming);
          }
        };

        timeout = setTimeout(() => getTiming(), 3000);
      } else {
        callback?.(0);
      }
    },
    // 查看当前元素的先祖是否在数组中
    isEleInArray(target: Element | null, arr: Element[]): boolean {
      if (!target || target === document.documentElement) {
        return false;
      }
      if (arr.indexOf(target) !== -1) {
        return true;
      }
      return this.isEleInArray(target.parentElement, arr);
    },
    // 是否在首屏时间中
    isInFirstScreen(target: Element): boolean {
      if (!target || typeof target.getBoundingClientRect !== 'function') return false;

      const rect = target.getBoundingClientRect();
      const screenHeight = window.innerHeight;
      const screenWidth = window.innerWidth;
      return (
        rect.left >= 0
        && rect.left < screenWidth
        && rect.top >= 0
        && rect.top < screenHeight
        && rect.width > 0
        && rect.height > 0
      );
    },
    // 计算元素数量
    walkAndCount(target: Element): number {
      let eleNum = 0;
      if (target && target.nodeType === 1) {
        eleNum += 1;
        const { children } = target;
        if (children?.length) {
          for (let i = 0; i < children.length; i++) {
            eleNum += this.walkAndCount(children[i]);
          }
        }
      }
      return eleNum;
    },
  });
}

export default plugin;
