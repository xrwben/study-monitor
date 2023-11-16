# 快应用 SDK

## 安装
### NPM

在项目支持 NPM 时推荐使用 NPM 安装 Aegis SDK。

```bash
$ npm install aegis-quickapp-sdk
```

## 使用

### 初始化

::: warning 注意 ⚠️
由于 `快应用` 中js的执行机制，因此推荐在 `app.ux` 的入口模块中进行初始化
:::
::: tip 当您做了以上接入工作之后，您已经开始享受 Aegis 提供的以下功能：
1、错误监控：retcode异常；
2、测速：接口测速；
3、数据统计和分析：可在腾讯云前端性能监控 [RUM 平台](https://console.cloud.tencent.com/rum)查看数据分析；
:::

使用非常简单，只需要新建一个 Aegis 实例，传入相应的配置即可。

不过由于 `快应用` 中js的执行机制，这里推荐一个设置全局变量的方法，用于将实例化的`Aegis`实例变量变为全局变量，方便调用

```javascript
// 引入sdk模块
import Aegis from 'aegis-quickapp-sdk';

// 实例化Aegis
const aegis = new Aegis({
  id: "pGUVFTCZyewxxxxx", // 项目上报ID
  uin: 'xxx', // 用户唯一 ID（可选）
  reportApiSpeed: true, // 接口测速
})

/**
 * @file 全局能力的配置与获取
 */

function getGlobalRef() {
  return Object.getPrototypeOf(global) || global;
}

const quickappGlobal = getGlobalRef();

/**
 * 设置全局(被APP与Page共享)数据；
 * @param key {string}
 * @param val {*}
 */
function setGlobalData(key, val) {
  quickappGlobal[key] = val;
}

/**
 * 获取全局(被APP与Page共享)数据；
 * @param key {string}
 * @return {*}
 */
function getGlobalData(key) {
  return quickappGlobal[key] || "";
}

// 两个方法默认定义在全局
setGlobalData("setGlobalData", setGlobalData);
setGlobalData("getGlobalData", getGlobalData);

// 设置aegis实例为全局变量
setGlobalData('aegis', aegis);
```

## 日志

Aegis SDK 会主动收集用户的一些性能和错误日志，开发者可以根据不同的参数来配置哪些日志需要上报，以及上报的日志具体信息。

### 日志类型

全部日志类型如下：

```javascript
{ logType: 'custom', name: '自定义测速' }
{ logType: 'event', name: '自定义事件' }
{ logType: 'log', name: '日志' }
{ logType: 'performance', name: '页面测速' }
{ logType: 'pv', name: '页面PV' }
{ logType: 'speed', name: '接口和静态资源测速' }
{ logType: 'vitals', name: 'web vitals' }
```


### 日志等级

全部日志等级如下：

```javascript
  { level: 1, name: '白名单日志' },
  { level: 2, name: '一般日志' },
  { level: 4, name: '错误日志' },
  { level: 8, name: 'Promise 错误' },
  { level: 16, name: 'Ajax 请求异常' },
  { level: 32, name: 'JS 加载异常' },
  { level: 64, name: '图片加载异常' },
  { level: 128, name: 'css 加载异常' },
  { level: 256, name: 'console.error' },
  { level: 512, name: '音视频资源异常' }
  { level: 1024, name: 'retcode 异常' }
  { level: 2048, name: 'aegis report' }
  { level: 4096, name: 'PV' }
  { level: 8192, name: '自定义事件' }
  { level: 16384, name: '小程序 页面不存在' }
  { level: 32768, name: 'websocket错误' }
  { level: 65536, name: 'js bridge错误' }
```


### 日志上报

创建完 Aegis 实例之后，就可以开心的上报日志啦 🥰，日志上报同样简单

```javascript
aegis.info(
  `我是一条白名单上报的信息，只有在白名单中的用户才会上报哟。`
);

aegis.infoAll(
  `我是一条普通的信息，如果上报量很大的话请谨慎使用哟。`
);

aegis.report(
  `我是一条错误信息，推荐在try..catch或者Promise.reject中使用，另外，我还会参与Aegis评分哟`
)
```


info vs infoAll

1. 使用 “infoAll ” 所有用户都上报，方便排查问题。但是也会带来一定的上报和存储成本。
2. 使用 “info” 白名单上报。出了问题，可能会缺少关键路径日志。需要添加白名单，重新操作收集日志（类似于染色系统操作）。


## aid

Aegis SDK 为每个用户设备分配的唯一标示，会存储在浏览器的 localStorage 里面，用来区分用户，计算 uv 等。aid 只有用户清理浏览器缓存才会更新。

## 实例方法

Aegis 实例暴露接口简单实用，目前 Aegis 实例有以下方法供您使用：
`setConfig` 、 `info` 、 `infoAll` 、 `report` 、 `error` 、 `reportEvent` 、 `reportTime` 、 `time` 、 `timeEnd`、`retcode`、 `destroy`

### setConfig

该方法用来修改实例配置，比如下面场景：
在实例化 Aegis 时需要传入配置对象

```javascript
const aegis = new Aegis({
  id: "pGUVFTCZyewxxxxx",
  uin: 777
})
```

很多情况下，并不能一开始就获取到用户的 `uin`，而等获取到用户的 `uin` 才开始实例化 Aegis，如果这期间发生了错误 Aegis 将监听不到。`uin` 的设置可以在获取到用户的时候：

```javascript
const aegis = new Aegis({
  id: "pGUVFTCZyewxxxxx"
})

// 拿到uin之后...
aegis.setConfig({
  uin: 777
})
```

### info、infoAll、report、error

这三个方法是 Aegis 提供的主要上报手段。

```javascript
// info 可以上报任意字符串，数字，数组，对象，但是只有打开页面的用户在名单中才会上报
aegis.info('test');
aegis.info('test', 123, ['a', 'b', 'c', 1], {a: '123'});


// 也可以上报特定的对象，支持用户传ext参数和trace参数
// 注意这种 case 一定要传 msg 字段
aegis.info({
 msg: 'test',
 ext1: 'ext1',
 ext2: 'ext2',
 ext3: 'ext3',
 trace: 'trace',
});

// 不同于 info，infoAll 表示全量上报
aegis.infoAll({
 msg: 'test',
 ext1: 'ext1',
 ext2: 'ext2',
 ext3: 'ext3',
 trace: 'trace',
});


// error 用来表示 JS 错误日志，也是全量上报，一般用于开发者主动获取JS异常，然后进行上报
aegis.error({
 msg: 'test',
 ext1: 'ext1',
 ext2: 'ext2',
 ext3: 'ext3',
 trace: 'trace',
});
aegis.error(new Error('主动上报一个错误'));

// report 默认是 aegis.report 的日志类型，但是现在你可以传入任何日志类型了
aegis.report({ 
 msg: '这是一个ajax错误日志', 
 level: Aegis.logType.AJAX_ERROR, 
 ext1: 'ext1', 
 ext2: 'ext2', 
 ext3: 'ext3', 
 trace: 'trace',
});
```

### reportEvent

该方法可用来上报自定义事件，平台将会自动统计上报事件的各项指标，诸如：PV、UV、平台分布等...

reportEvent 可以支持两种类型上报参数类型，一种是字符串类型

```javascript
aegis.reportEvent('XXX请求成功');
```

一种是对象类型，ext1 ext2 ext3 默认使用 new Aegis 的时候传入的参数，自定义事件上报的时候，可以覆盖默认值。

```javascript
aegis.reportEvent({
  name: 'XXX请求成功',
  ext1: '额外参数1',
  ext2: '额外参数2',
  ext3: '额外参数3',
})
```

注意，额外参数的三个 key 是固定的，目前只支持 ext1 ext2 ext3。

### reportTime

该方法可用来上报自定义测速，例如：

```javascript
// 假如‘onload’的时间是1s
aegis.reportTime('onload', 1000);
```

或者如果需要使用额外参数，可以传入对象类型参数，ext1，ext2，ext3 会覆盖默认值：

```javascript
aegis.reportTime({
  name: 'onload', // 自定义测速 name
  duration: 1000, // 自定义测速耗时(0 - 60000)
  ext1: 'test1',
  ext2: 'test2',
  ext3: 'test3',
});
```

> `onload` 可以修改为其他的命名。

### time、timeEnd

该方法同样可用来上报自定义测速，适用于两个时间点之间时长的计算并上报，例如：

```javascript
aegis.time('complexOperation');
/**
 * .
 * .
 * 做了很久的复杂操作之后。。。
 * .
 * .
 */
aegis.timeEnd('complexOperation'); /** 此时日志已经报上去了😄**/
```

> `complexOperation` 同样可以修改为其他的命名。
> 自定义测速是用户上报任意值，服务端对其进行统计和计算，因为服务端不能做脏数据处理，因此建议用户在上报端进行统计值限制，防止脏数据对整体产生影响。
> 目前 Aegis 只支持 0-60000 的数值计算，如果大于该值，建议进行合理改造。
> 高频率的自定义测速上报尽量使用 reportTime。time 和 timeEnd 上报会存在上报值覆盖的问题。比如 aegis.time(aaa), 在调用 aegis.timeEnd(aaa) 之前，又调用了一次 aegis.time(aaa), 则上报的时间为 timeEnd 时间 - 第二次 time 的时间。

### retcode

该方法可用来上报自定义接口的返回码，同时支持接口测速上报，例如：

```javascript
aegis.retcode({
  ret:0,
  url:'myHippyApi'
})
```

retcode方法还支持其他一些参数配置

```js
{
  url: "",// 接口名字
  isHttps: true,// 协议类型
  method: 'GET',// http请求方式
  type: 'fetch',// 接口类型 fetch|static
  duration: 0,// 耗时
  ret: 0,// 返回码
  status: 200,// http状态码
}
```

### destroy

该方法用于销毁 sdk 实例，销毁后，不再进行数据上报

```javascript
aegis.destroy();
```

## 白名单

白名单功能是适用于开发者希望对某些特定的用户上报更多的日志，但是又不希望太多上报来影响到全部日志数据，并且减少用户的接口请求次数，因为 TAM 设定了白名单的逻辑。

1. 白名单用户会上报全部的 API 请求信息，包括接口请求和请求结果。
2. 白名单用户可以使用 info 接口信息数据上报。
3. info vs infoAll：在开发者实际体验过程中，白名单用户可以添加更多的日志，并且使用 info 进行上报。infoAll 会对所有用户无差别进行上报，因此可能导致日志量上报巨大。
4. 通过接口 whitelist 来判断当前用户是否是白名单用户，白名单用户的返回结果会绑定在 aegis 实例上 (aegis.isWhiteList) 用来给开发者使用。
5. 用了减少开发者使用负担，白名单用户是团队有效，可以在 [应用管理-白名单管理](https://console.cloud.tencent.com/rum/web/group-whitelist-manage) 内创建白名单，则团队下全部项目都生效。


## 钩子函数

### beforeRequest

该钩子将会在日志上报前执行，用于对上报数据的拦截和修改，通过返回不同类型的值：
* 拦截：返回false
* 修改：修改入参的值并返回

```javascript
const aegis = new Aegis({
  id: "pGUVFTCZyewxxxxx",
  beforeRequest: function(data) {
    // 入参 data 的数据结构：{logs: {…}, logType: "log"}
    if (data.logType === 'log' && data.logs.msg.indexOf('otheve.beacon.qq.com') > -1) {
      // 拦截：日志类型为 log，且内容包含 otheve.beacon.qq.com 的请求
      return false;
    }
    // 入参 data 数据结构：{logs: {}, logType: "speed"}
    if (data.logType === 'speed' && data.logs.url.indexOf('otheve.beacon.qq.com') > -1) {
      // 拦截：日志类型为 speed，并且接口 url 包含 otheve.beacon.qq.com 的请求
      return false;
    }
    return data;
  }
});
```

其中，`msg` 将会有以下几个字段：  

> 1.`logs`: 上报的日志内容;  

> 2.`logType`: 日志类型

logType等于`custom`时，logs的值如下：

```sh
{name: "白屏时间", duration: 3015.7000000178814, ext1: '', ext2: '', ext3: '', from: ''}
```

logType等于`event`时，logs的值如下：

```sh
{name: "ios", ext1: "", ext2: "", ext3: ""}
```

logType等于`log`时，logs的值如下：

```sh
{ level: '1', msg: '接口请求日志（白名单日志）' } // 具体level信息参考日志等级
```

logType等于`performance`时，logs的值如下：

```sh
{contentDownload: 2, dnsLookup: 0, domParse: 501, firstScreenTiming: 2315, resourceDownload: 2660, ssl: 4, tcp: 4, ttfb: 5}
```

logType等于`speed`时，logs的值如下：

```sh
// 静态资源
{connectTime: 0, domainLookup: 0, duration: 508.2, nextHopProtocol: "", isHttps: true, method: "get", status: 200, type: "static", url: "https://puui.qpic.cn/xxx", urlQuery: "max_age=1296000"}

// API
{duration: 26, isErr: 0, isHttps: true, method: "GET", nextHopProtocol: "", ret: "0", status: 200, type: "fetch", url: "https://xx.com/cgi-bin/whoami"}
```

logType等于`vitals`时，logs的值如下：

```sh
{CLS: 3.365504747991234, FCP: 139.39999997615814, FID: -1, LCP: 127.899}
```
### modifyRequest

该钩子函数会在所有请求发出前调用，参数中会传入请求的所有内容，必须返回待发送内容。

```javascript
function changeURLArg(url,arg,arg_val) {
  var pattern=arg+' = ([^&]*)';
  var replaceText = arg+'='+arg_val;
  if (url.match(pattern)) {
    var tmp = '/('+ arg+'=)([^&]*)/gi';
    tmp = url.replace(eval(tmp),replaceText);
    return tmp;
  }
  return url;
}
const aegis = new Aegis({
  id: 'pGUVFTCZyewxxxxx',
  modifyRequest(options) {
    if (options.type === 'performance') {
      // 页面测速，此时可以修改options内容，如修改页面测速platform
      options.url = changeURLArg(options.url, 'platform', type)
    }
    return options
  }
});
```
### afterRequest

该勾子将会在数据上报后被执行，例如：

```javascript
const aegis = new Aegis({
  id: "pGUVFTCZyewxxxxx",
  reportApiSpeed: true,
  reportAssetSpeed: true,
  afterRequest: function(msg) {
    // {isErr: false, result: Array(1), logType: "log", logs: Array(4)}
    console.log(msg);
  }
});
```

其中，`msg` 将会有以下几个字段：  

> 1.`isErr`: 请求上报接口是否错误；  

> 2.`result`: 上报接口的返回结果；  

> 3.`logs`: 上报的日志内容;

> 4.`logType`: 日志类型，有以下值speed：接口和静态资源测速，performance：页面测速，vitals：web vitals，event：自定义事件，custom：自定义测速;

## 错误监控

::: warning
Aegis 的实例不会自动进行监控，注意！当您只是引入了 SDK 而没有将其实例化，且没有手动监控错误时，Aegis 将什么都不会做。
由于 `快应用` 中js的执行机制，因此必须在 `app.ux` 的入口模块中进行手动监听。
:::

### 监控方法

```js
// app.ux
<script>
import Aegis from '@tencent/aegis-quickapp-sdk';

const aegis = new Aegis({
  id: "pGUVFTCZyewxxxxx", // 项目上报ID
	reportApiSpeed: true, // 接口测速
})

export default {
  onError(err) {
  aegis.error(err);
  }
};
</script>
```

### retcode异常

同上，Aegis 改写 `fetch` 对象（Aegis真的很专业）之后，将获得API返回的内容并尝试在内容中获取到本次请求的 `retcode`。

> retcode 的值会从用户返回 response body 的第一层（如果第一层取不到，再取第二层）的 code、ret、retcode、errcode 中获取。
> Aegis 默认 retcode 的值为0是正常的，非0都是异常的。当 `retcode` 发生异常的时候，会上报一个 retcode异常的日志。
> 用户可以通过 api.retCodeHandler 对这个值和是否异常进行修正。


## 性能监控

### 接口测速

> 打开方式：初始化时传入配置 `reportApiSpeed: true`

Aegis 通过重写 `fetch` 进行接口测速，具体源代码在 [cgi-speed](https://git.woa.com/tam/aegis-sdk/blob/master/packages/quickapp-sdk/src/plugins/cgi-speed.ts)

在设置`reportAssetSpeed:true`的前提下，用`aegisFetch`方法替代`fetch.fetch`，如下：
```js
// 入参和快应用的fetch.fetch方法一致
aegis.aegisFetch({
  url,
  data,
  success: () => {}, // 可以通过回调处理，如果有回调，则会进入回调逻辑，后续链式无效
})
.then(browserProcess) // 也可以通过Promise进行链式调用
.then(cgiProcess)
.catch(errHandle);

```


<!-- ## 离线日志

> 打开方式：初始化时传入配置 `offlineLog: true`

::: warning 注意 ⚠️
由于 `hippy` 中 `js` 与原生的交互都通过同一个 `bridge`，所以 `AsyncStorage`的读写可能会影响到 `UI` 数据交互，因此这里只实现将日志存储在内存中，用户需要自己实现读写逻辑，在合适的时候，读取日志，并存储到本地或者上传到 `Aegis`后台
:::
::: tip 使用注意事项
1、定期从 `Aegis` 中读取日志，并写入到本地的。推荐使用 [`internalBinding`](https://zhuanlan.zhihu.com/p/98431027) 来实现
2、定期清除过期日志，避免存储过多数据
:::

### getOfflineLog

> 读取当前所有日志，读取之后，Aegis会将已经被读取的日志情况

使用方式：
```js
let flogs = aegis.getOfflineLog();
// 存储到本地
```

### uploadOfflineLogs

> 上报离线日志

使用方式

```js
aegis.uploadOfflineLogs(flogs); // flogs 为之前存储的离线日志，数组的形式
``` -->


## 配置文档

| 配置 | 描述 |
| -------- | -------- |
| id | 必须，string，默认 无。<br>开发者平台分配的项目上报ID |
| uin | 建议，string，默认 无。<br>当前用户的唯一标识符，白名单上报时将根据该字段判定用户是否在白名单中，字段仅支持`字母数字@=._-`，正则表达式: `/^[@=.0-9a-zA-Z_-]{1,60}$/` |
| reportApiSpeed | 可选，boolean，默认 false。<br>是否开启接口测速 |
| version | 可选，string，默认 sdk 版本号。<br>当前上报版本，当页面使用了pwa或者存在离线包时，可用来判断当前的上报是来自哪一个版本的代码，仅支持`字母数字.,:_-`，长度在 60 位以内 `/^[0-9a-zA-Z.,:_-]{1,60}$/` |
| delay | 可选，number，默认 1000 ms。<br>上报节流时间，在该时间段内的上报将会合并到一个上报请求中。 |
| repeat | 可选，number，默认 5。<br>重复上报次数，对于同一个错误或者同一个接口测速超过多少次不上报。如果传入 repeat 参数为 0，则不限制。 |
| env | 可选，enum，默认 Aegis.environment.production。 <br> 当前项目运行所处的环境。｜
| api | 可选，object，默认为{}。相关的配置: <br> apiDetail : 可选，boolean，默认false。上报 api 信息的时候，是否上报 api 的请求参数和返回值; <br><br> retCodeHandler: Function(data: String, url: String, xhr: Object):{isErr: boolean, code: string}， 返回码上报钩子函数。 会传入接口返回数据,请求url和xhr对象; <br><br> reqParamHandler: Function(data: any, url: String) 上报请求参数的处理函数，可以对接口的请求参数进行处理，方便用户过滤上报请求参数的信息; <br><br> resBodyHandler: Function(data: any, url: String) 上报 response 返回 body 的处理函数，可以对接口返回值的 response body 进行处理，只上报关键信息; <br><br> ret: 可选，string[]或string, 默认为['ret', 'retcode', 'code']。接口返回码key。<span id="jump">[见示例[1]](#exp1)</span><br><br> errCode: 可选，string[ ]或string,默认为[]。接口返回码value。如果http返回码存在于errCode中，则会认为此次请求失败并上报。[见示例[2]](#exp2);<br><br> code: 可选，string[]或string, 默认为['0']。接口返回码value。如果http返回码不存在于code中，则会认为此次请求失败并上报.[见示例[3]](#exp3)<br><br>如果配置了errCode或code，则不会使用默认值。
| hostUrl | 可选，默认是 `https://aegis.qq.com`。<br>影响全部上报数据的 host 地址，下面几个 url 地址设置后会覆盖对应的上报地址 ｜
| url | 可选，string，默认 'https://aegis.qq.com/collect'。<br>日志上报地址 |
| pvUrl | 可选，string, 默认 'https://aegis.qq.com/collect/pv' <br> pv 上报地址 ｜ 
| whiteListUrl | 可选，string，默认 'https://aegis.qq.com/collect/whitelist'。<br>白名单确认接口 <br>如果想要关闭白名单接口请求，可以传空字符串|
| offlineUrl | 可选，string，默认 'https://aegis.qq.com/collect/offline'。<br> 离线日志上报地址 |
| eventUrl | 可选，string，默认 'https://aegis.qq.com/collect/events'。<br> 自定义事件上报地址 |
| customTimeUrl | 可选，string，默认 'https://aegis.qq.com/speed/custom'。<br>自定义测速上报地址 |
| speedUrl | 可选，string，默认 'https://aegis.qq.com/speed'。<br>测速日志上报地址 |
| ext1 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |
| ext2 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |
| ext3 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |

