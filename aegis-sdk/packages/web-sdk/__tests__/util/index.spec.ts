import { SpeedLog, speedShim } from '../../../core/src';

describe('web-sdk util', () => {
  it('check speedShim func', () => {
    const logStatic: SpeedLog = {
      url: 'https://www.baidu.com', // 请求地址,
      isHttps: true, // 请求地址是否https
      method: 'get', // 请求方法
      type: 'static', // static 静态资源测速  fetch cgi测速
      duration: 200, // 耗时
      ret: '200', // cgi 的状态码，如果是图片或其他的，则没有该字段
      status: 200, // http 返回码（静态资源的话成功200，失败400）
      // payload: {} // 额外数据，包含了cgi请求的XMLHt
    };
    const bean = {};

    const paramStatic = {
      duration: {
        fetch: [],
        static: [logStatic],
        bridge: [],
      },
      ...bean,
    };
    const resultStatic = {
      payload: JSON.stringify(paramStatic),
    };

    expect(speedShim(logStatic, bean)).toEqual(resultStatic);

    const logFetch: SpeedLog = {
      url: 'https://www.baidu.com', // 请求地址,
      isHttps: true, // 请求地址是否https
      method: 'get', // 请求方法
      type: 'fetch', // static 静态资源测速  fetch cgi测速
      duration: 200, // 耗时
      isErr: 0,
      ret: '200', // cgi 的状态码，如果是图片或其他的，则没有该字段
      status: 200, // http 返回码（静态资源的话成功200，失败400）
      // payload: {} // 额外数据，包含了cgi请求的XMLHt
    };
    const paramsFetch = {
      duration: {
        fetch: [logFetch],
        static: [],
        bridge: [],
      },
      ...bean,
    };

    const resultFetch = {
      payload: JSON.stringify(paramsFetch),
    };

    expect(speedShim(logFetch, bean)).toEqual(resultFetch);

    const logArr: SpeedLog[] = [{
      url: 'https://www.baidu.com', // 请求地址,
      isHttps: true, // 请求地址是否https
      method: 'get', // 请求方法
      type: 'fetch', // static 静态资源测速  fetch cgi测速
      duration: 200, // 耗时
      ret: '200', // cgi 的状态码，如果是图片或其他的，则没有该字段
      status: 200, // http 返回码（静态资源的话成功200，失败400）
      // payload: { name: 20 }, // 额外数据，包含了cgi请求的XMLHt
    }, {
      url: 'https://www.baidu.com', // 请求地址,
      isHttps: true, // 请求地址是否https
      method: 'get', // 请求方法
      type: 'static', // static 静态资源测速  fetch cgi测速
      duration: 200, // 耗时
      ret: '200', // cgi 的状态码，如果是图片或其他的，则没有该字段
      status: 200, // http 返回码（静态资源的话成功200，失败400）
      // payload: {} // 额外数据，包含了cgi请求的XMLHt
    }];
    const paramsArr = {
      duration: {
        fetch: [{
          url: 'https://www.baidu.com', // 请求地址,
          isHttps: true, // 请求地址是否https
          method: 'get', // 请求方法
          type: 'fetch', // static 静态资源测速  fetch cgi测速
          duration: 200, // 耗时
          ret: '200', // cgi 的状态码，如果是图片或其他的，则没有该字段
          status: 200, // http 返回码（静态资源的话成功200，失败400）
        }],
        static: [logArr[1]],
        bridge: [],
      },
      ...bean,
    };

    const resultArr = {
      payload: JSON.stringify(paramsArr),
    };

    expect(speedShim(logArr, bean)).toEqual(resultArr);
  });


  // test('check loadScript func', (done) => {
  //     loadScript('https://tam.cdn-go.cn/aegis-sdk/latest/aegis.min.js', '', () => {
  //         console.log(333)
  //         expect(typeof (window as any).Flog).toBe('function');
  //         done()
  //     })
  // })
});
