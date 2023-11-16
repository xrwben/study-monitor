/* eslint-disable prefer-rest-params */

// chrome43内核版本不支持 Array.find 方法
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    configurable: true,
    writable: true,
    value(predicate: any) {
      if (this === null) {
        throw new TypeError('"this" is null or not defined');
      }

      const o = Object(this);
      const len = o.length >>> 0;

      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // eslint-disable-next-line prefer-destructuring
      const thisArg = arguments[1];
      let k = 0;

      while (k < len) {
        const kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        k += 1;
      }

      return undefined;
    },
  });
}

if (!window.WeakSet) {
  let counter = Date.now() % 1e9;
  class WeakSet {
    public name: string;
    public constructor(data: { [key: string]: any }[]) {
      this.name = `__st${Math.random() * 1e9 >>> 0}${counter}__`;
      data?.forEach(this.add, this);
      counter += 1;
    }
    public add(val: { [key: string]: any }) {
      const { name } = this;
      if (!val[name]) Object.defineProperty(val, name, { value: true, writable: true });
      return this;
    }
    public delete(val: { [key: string]: any }) {
      if (!val[this.name]) return false;
      val[this.name] = undefined;
      return true;
    }
    public has(val: { [key: string]: any }) {
      return !!val[this.name];
    }
  }

  Object.defineProperty(window, 'WeakSet', {
    value(data: { [key: string]: any }[]) {
      return new WeakSet(data);
    },
  });
}
