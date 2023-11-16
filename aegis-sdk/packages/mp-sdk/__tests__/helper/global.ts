const originComponent = (global as any).Component;
(global as any).Component = (options: any): any => {
  Object.keys(options.methods = options.methods || {}).forEach((method) => {
    const originMethod = options.methods[method];
    options.methods[method] = function (...args: any[]) {
      try {
        originMethod.apply(this, args);
      } catch (err) {
        // 小程序 error 只能是 string
        dispatchOnError(err.stack);
      }
    };
  });

  return originComponent(options);
};

(global as any).Page = (options: any): any => {
  const extraData: any = {};
  if (!options.methods) options.methods = {};
  Object.keys(options).forEach((key) => {
    if (key === 'methods') return;
    const value = options[key];
    if (typeof value === 'function') {
      options.methods[key] = value;
    } else {
      extraData[key] = value;
    }
  });
  // 通过ready方法挂载this数据
  const oldReady = options.ready ? options.ready : () => { /* empty */ };
  options.ready = function () {
    Object.keys(extraData).forEach((key) => {
      (this as any)[key] = extraData[key];
    });
    oldReady();
  }
  ;(global as any).Component(options);
};


const onErrorHandles: Function[] = [];
(global as any).wx.onError = (callback: Function) => {
  onErrorHandles.push(callback);
};

const dispatchOnError = function (error: Error) {
  onErrorHandles.forEach((handle) => {
    handle(error);
  });
};
