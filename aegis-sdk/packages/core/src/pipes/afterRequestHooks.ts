import Core from '../core';
import { Pipe } from './index';

export const afterRequestHooks = (aegis: Core): Pipe  => (result, resolve) => {
  aegis.lifeCycle?.emit('afterRequest', result);
  const { afterRequest } = aegis.config || {};
  if (typeof afterRequest === 'function' && afterRequest(result) === false) {
    return;
  }
  resolve(result);
};
