import Core from '../core';
import { SendOption } from '../interface';
import { Pipe } from './index';

export const modifyRequestHooks = (aegis: Core): Pipe  => (options: SendOption, resolve) => {
  aegis.lifeCycle.emit('modifyRequest', options);
  const { modifyRequest } = aegis.config;
  if (typeof modifyRequest === 'function') {
    try {
      const result = modifyRequest(options);
      if (typeof result === 'object' && 'url' in result) {
        // 返回值是SendOption，则修改options
        options = result;
      }
    } catch (error) {
      console.error(error);
    }
  }
  resolve(options);
};
