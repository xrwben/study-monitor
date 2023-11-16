export interface SetDataConfig {
  disabled?: boolean;       // 是否禁用setData上报
  timeThreshold?: number;   // 上报耗时的阈值
  withDataPaths?: boolean;  // 是否上报更新的字段信息
}
