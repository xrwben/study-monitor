export interface UpdatePerformanceResult {
  updateProcessId: number;  // 此次更新过程的ID
  parentUpdateProcessId: number;  // 对于子更新，返回它所属的更新过程 ID
  isMergedUpdate: boolean;  // 是否是被合并更新
  dataPaths: Array<Array<string | number>>;  // 此次更新的 data 字段信息，只有 withDataPaths 设为 true 时才会返回
  pendingStartTimestamp: number;  // 此次更新进入等待队列时的时间戳
  updateStartTimestamp: number;  // 更新运算开始时的时间戳
  updateEndTimestamp: number;  // 更新运算结束时的时间戳
}
