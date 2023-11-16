export enum Environment {
  production = 'production', // 生产环境
  development = 'development', // 开发环境
  gray = 'gray', // 灰度环境
  pre = 'pre', // 预发布环境
  daily = 'daily', // 日发布环境
  local = 'local', // 本地环境
  test = 'test', // 测试环境
  others = 'others' // 其他环境
}


export const isEnvironment = (val: string) => {
  switch (val) {
    case Environment.production:
    case Environment.development:
    case Environment.gray:
    case Environment.pre:
    case Environment.daily:
    case Environment.local:
    case Environment.test:
    case Environment.others:
      return true;
    default:
      return false;
  }
};


