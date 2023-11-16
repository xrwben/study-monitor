/**
 * liteapp 请求方法重写
 *
 * @param opts
 * @returns
 */
export interface OriginRequestResp {
  status: number;
  data?: any;
}
export interface OriginRequestReq extends RequestInit {
  url: RequestInfo
}


export const originRequest = async (opts: OriginRequestReq): Promise<OriginRequestResp> => {
  try {
    const res = await fetch(opts.url, opts);
    const { status } = res || {};
    // 响应非20x
    if (!String(status).match(/^20\d+/g)) {
      throw res;
    }
    const resBody = await res.clone().text();
    if (!resBody) {
      // 响应空包，liteapp里，res.json会抛出异常导致crash, 先做判断
      return {
        status,
        data: {},
      };
    }
    const data = await res.json();
    return {
      status,
      data,
    };
  } catch (error) {
    return Promise.reject(error);
  }
};

// 劫持fetch，执行注入的函数
export interface HackFetchOptions {
  name: string;
  beforeFetch?: (url: string, option: RequestInit) => void;
  then?: (res: Response, duration: number, url: string, option?: RequestInit) => void;
  catch?: (err: any, duration: number, url: string, option?: RequestInit) => void;
}

let alreadyHackFetch = false;
const hackFetchOptionsList: HackFetchOptions[] = [];

export const hackFetch = function (options: HackFetchOptions) {
  if (hackFetchOptionsList.find(option => option.name === options.name)) {
    throw new Error(`name '${options.name}' is already in hackFetch option list`);
  }
  hackFetchOptionsList.push(options);
  if (alreadyHackFetch || !fetch) return;
  alreadyHackFetch = true;

  const originFetch = fetch;
  // @ts-ignore
  fetch = function aegisFakeFetch(url: RequestInfo, fetchOption) {
    const fetchUrl = typeof url === 'string' ? url : url.url;
    hackFetchOptionsList.forEach((option) => {
      try {
        typeof option.beforeFetch === 'function' && option.beforeFetch(fetchUrl, fetchOption);
      } catch (e) { }
    });
    const sendTime = Date.now();
    return originFetch(url, fetchOption)
      .then((res) => {
        hackFetchOptionsList.forEach((option) => {
          try {
            typeof option.then === 'function'
              && option.then(res, Date.now() - sendTime, fetchUrl, fetchOption);
          } catch (e) { }
        });
        // 原封不动返回res
        return res;
      })
      .catch((err) => {
        hackFetchOptionsList.forEach((option) => {
          try {
            typeof option.catch === 'function'
              && option.catch(err, Date.now() - sendTime, fetchUrl, fetchOption);
          } catch (e) { }
        });
        // 原封不动继续抛出err
        throw err;
      });
  };
};
