/* eslint-disable */
// @ts-ignore
const stream = typeof weex !== 'undefined' && weex?.requireModule('stream');
const weexFetch = stream?.fetch;

export interface WeexFetchResponse {
  ok: boolean,
  status: number,
  statusText: string,
  data: string,
  headers: object,
}

export const wrapResponse = (res: WeexFetchResponse) => {
  const { ok, status, statusText, data, headers } = res;
  return {
    ok,
    status,
    statusText,
    body: data,
    headers,
    clone: () => wrapResponse(res),
    text: () => new Promise(rs => rs(data)),
    json: () => new Promise((rs, rj) => {
      try {
        rs(JSON.parse(data));
      } catch (ex) {
        rj(new Error('response body is not JSON'));
      }
    }),
  };
};

/**
 * 将 weex 的 fetch 封装成标准 fetch
 */
const fetch = (url: string, options: object = {}) => new Promise((rs, rj) => {
  if (!weexFetch) rj(new Error('no available fetch found!'));
  try {
    // console.log(`[aegis] fetch-proxy: ${url}`);
    weexFetch({
      ...options,
      url,
      type: 'text',
    }, (res: WeexFetchResponse) => rs(wrapResponse(res)));
  } catch (ex) {
    rj(ex);
  }
});

export {
  fetch,
  weexFetch,
};
