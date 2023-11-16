// 判断是native还是web
export const isNative = function (): boolean {
  return cc.sys.isNative;
};

// 获取场景名
export const getSceneName = function (): string {
  const scene = cc.director.getScene();
  if (scene) {
    return scene.name;
  }
  return '';
};
