export interface PagePerformanceLog {
  entryType?: string;
  name?: string;
  startTime?: number;
  duration?: number;
  path?: string;
  navigationType?: string;
  [x: string]: any;
}

export interface AppLaunchPerformanceLog extends PagePerformanceLog {
  appLaunch: number; // 启动耗时
}

export interface PageFirstRenderPerformanceLog extends PagePerformanceLog {
  firstScreenTiming: number; // 启动耗时
}

export interface EvaluateScriptPerformanceLog extends PagePerformanceLog {
  scriptEvaluateTiming: number; // 页面js执行耗时
}

export interface PageRoutePerformanceLog extends PagePerformanceLog {
  pageRouteTiming: number; // 页面切换耗时
}
