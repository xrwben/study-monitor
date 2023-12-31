# aegis-hippy-sdk

Aegis 是腾讯云监控团队提供的前端监控 SDK，涵盖了错误监控，资源测速（img, script, css），接口测速，页面性能（首屏时间）。无需侵入代码，只需引入 SDK 即可自动完成所有监控上报。

在使用 aegis 时无需在业务代码中打点或者做任何其他操作，可以做到与业务代码充分解耦。aegis 将会自动监控前端错误，在错误发生时上报错误的具体情况，帮助您快速定位问题。当您开启资源测速时，aegis 将会自动监听页面资源加载情况（耗费时长、成功率等），并在不影响前端性能的前提下收集前端的性能数据，帮助您快速定位性能短板，提升用户体验。

使用本 SDK 需要配合使用腾讯云前端性能监控 [RUM 平台](https://console.cloud.tencent.com/rum)。

aegis-hippy-sdk 是针对hippy应用程序开发的数据收集和上报 SDK。

## 安装

### NPM

在项目支持 NPM 时推荐使用 NPM 安装 Aegis SDK。

```bash
$ npm install aegis-hippy-sdk
```

## 使用

### 初始化

使用非常简单，只需要新建一个 Aegis 实例，传入相应的配置即可：

```javascript
import Aegis from 'aegis-hippy-sdk';

const aegis = new Aegis({
  id: "pGUVFTCZyewxxxxx", // 项目上报ID
  uin: 'xxx', // 用户唯一 ID（可选）
  reportApiSpeed: true, // 接口测速
})

```

::: warning 注意 ⚠️
由于 `hippy` 中js的执行机制，因此推荐在 `entryPage` 的入口模块中进行初始化
:::

::: tip 当您做了以上接入工作之后，您已经开始享受 Aegis 提供的以下功能：
1、错误监控：retcode异常；  
2、测速：接口测速；  
3、数据统计和分析：可在 [RUM 平台](https://console.cloud.tencent.com/rum) 上查看各个纬度的数据分析；
:::


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

info vs infoAll

1. 使用 “infoAll ” 所有用户都上报，方便排查问题。但是也会带来一定的上报和存储成本。
2. 使用 “info” 白名单上报。出了问题，可能会缺少关键路径日志。需要添加白名单，重新操作收集日志（类似于染色系统操作）。


## aid

Aegis SDK 为每个用户设备分配的唯一标示，会存储在浏览器的 localStorage 里面，用来区分用户，计算 uv 等。aid 只有用户清理浏览器缓存才会更新。


## 实例方法

Aegis 实例暴露接口简单实用，目前 Aegis 实例有以下方法供您使用：  
`setConfig` 、 `info` 、 `infoAll` 、 `report` 、 `error` 、 `reportEvent` 、 `reportTime` 、 `time` 、 `timeEnd`、`retcode`、 `destroy`、`reportPerformanceData`

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

### info、infoAll、report

这三个方法是 Aegis 提供的主要上报手段。

```javascript
aegis.info('上报一条白名单日志，这两种情况这条日志才会报到后台：1、打开页面的用户在名单中；2、对应的页面发生了错误🤨');

aegis.infoAll('上报了一条日志，该上报与info唯一的不同就在于，所有用户都会上报');

aegis.report(new Error('上报一个错误'));
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
  isErr: 0, // retcode 是否成功 0: 成功 1: 失败
  status: 200,// http状态码
}
```

### destroy

该方法用于销毁 sdk 实例，销毁后，不再进行数据上报

```javascript
aegis.destroy();
```

### reportPerformanceData

该方法用于自定上报页面性能数据，支持上报引擎初始化、模板加载、首屏渲染、首屏接口、页面完全加载五项指标，例如：

```js
aegis.reportPerformanceData({
  engineInit: 100,
  bundleLoad: 100,
  firstScreenTiming: 100, // 从模板加载后算起
  firstScreenRequest: 100, // 从模板加载后算起
  loadEnd: 100, // 从模板加载后算起
});
```
> 为了避免极大或者极小的上报数据影响指标观测，sdk 侧对上述各个指标做了阈值限制，超出阈值后会上报默认值0，阈值如下：
>engineInit: [0, 10000]
>bundleLoad: [0, 10000]
>firstScreenTiming: [0, 10000]
>firstScreenRequest: [0, 15000]
>loadEnd: [0, 15000]

## 白名单

白名单功能是适用于开发者希望对某些特定的用户上报更多的日志，但是又不希望太多上报来影响到全部日志数据，并且减少用户的接口请求次数，因为 TAM 设定了白名单的逻辑。

1. 白名单用户会上报全部的 API 请求信息，包括接口请求和请求结果。
2. 白名单用户可以使用 info 接口信息数据上报。
3. info vs infoAll：在开发者实际体验过程中，白名单用户可以添加更多的日志，并且使用 info 进行上报。infoAll 会对所有用户无差别进行上报，因此可能导致日志量上报巨大。
4. 通过接口 whitelist 来判断当前用户是否是白名单用户，白名单用户的返回结果会绑定在 aegis 实例上 (aegis.isWhiteList) 用来给开发者使用。
5. 用了减少开发者使用负担，白名单用户是团队有效，可以在 [应用管理-白名单管理](https://console.cloud.tencent.com/rum/web/group-whitelist-manage) 内创建白名单，则团队下全部项目都生效。

## 钩子函数

### beforeRequest

该钩子将会在日志上报前执行，例如：

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

> 2.`logType`: 日志类型，有以下值 custom：自定义测速，event：自定义事件，log：日志，pv：页面PV，speed：接口和静态资源测速

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

logType等于`speed`时，logs的值如下：

```sh
{connectTime: 0, domainLookup: 0, duration: 508.2, isHttps: true, method: "get", status: 200, type: "static", url: "https://puui.qpic.cn/tv/0/1231250375_300400/0", urlQuery: "max_age=1296000"}
```

当该钩子返回 `false` 时，本条日志将不会进行上报，该功能可用来过滤某些不需要上报的错误，例如：

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
throw new Error('碍眼的错误'); // 该错误将不会被上报
```

上面例子中，当上报的错误内容包含 `碍眼的错误` 几个关键字时，将不会上报至 Aegis 后台中。

### afterRequest

该勾子将会在测速数据上报后被执行，例如：

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

### onWhitelist

白名单接口请求成功后会回调此钩子函数，可以告诉当前用户是否是白名单用户。拿到用户身份状态可以做一些跟Aegis逻辑无关的业务处理，比如白名单用户做个特殊样式展示。

```js
new Aegis({
  // @isWhitelist {boolean} 是否为白名单身份
  onWhitelist(isWhitelist){},
  uin: 0,
  id: 'pGUVFTCZyewxxxxx',
})
```

## 错误监控

::: warning
Aegis 的实例会自动进行以下监控，注意！是 Aegis 实例会进行监控，当您只是引入了 SDK 而没有将其实例化时，Aegis 将什么都不会做。
:::

### retcode异常

同上，Aegis 改写 `fetch` 对象之后，将获得API返回的内容，并尝试在内容中获取到本次请求的 `retcode`。

> retcode 的值会从用户返回 response body 的第一层（如果第一层取不到，再取第二层）的 code、ret、retcode、errcode 中获取。
> Aegis 默认 retcode 的值为0是正常的，非0都是异常的。当 `retcode` 发生异常的时候，会上报一个 retcode异常的日志。
> 用户可以通过 api.retCodeHandler 对这个值和是否异常进行修正。

## 性能监控

### fetch接口测速

> 打开方式：初始化时传入配置 `reportApiSpeed: true`  

Aegis 通过劫持 `fetch` 进行接口测速。

### hippy bridge 接口测速

Aegis 通过劫持业务中使用的 hippyBridge 实例来进行bridge接口测速。
> 打开方式：初始化时传入配置:
`reportBridgeSpeed: true;`
`hippyBridge: hippyBridgeObj`

bridge接口测速是sdk对hippyBridge对象上的callNativeWithPromise进行拦截并重写，这个hippyBridge对象可以由业务自定义（例如业务中重新改写了global.Hippy.bridge），对于业务定制的情况，传入的hippyBridgeObj应为业务中调用的callNativeWithPromise方法所在的对象或实例，例如Hippy.Bridge或者自定义对象，如不传，测速是默认拦截并重写global.Hippy.bridge.callNativeWithPromise。

## 离线日志

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
```

## 配置文档


| 配置 | 描述 |
| -------- | -------- |
| id | 必须，string，默认 无。<br>开发者平台分配的项目上报ID |
| uin | 建议，string <br>业务定义的当前用户的唯一标识符，用来查找固定用户的日志。白名单上报时将根据该字段判定用户是否在白名单中，字段仅支持`字母数字@=._-`，正则表达式: `/^[@=.0-9a-zA-Z_-]{1,60}$/` |
| reportApiSpeed | 可选，boolean，默认 false。<br>是否开启接口测速 |
| reportBridgeSpeed | 可选，boolean，默认 false。<br>是否开启 jsbridge 监控上报 |
| pageUrl | 可选。默认是空。 <br> 修改上报数据中页面地址，开发者可以主动对数据进行聚合 ｜
| hippyBridge | 可选，Object，默认为global.Hippy.bridge。<br>业务调用的 callNativeWithPromise/callNative 所在的bridge实例，例如 Hippy.Bridge 或者自定义对象，默认拦截 global.Hippy.bridge.callNativeWithPromise 和 global.Hippy.bridge.callNative |
| getNetworkStatus | 可选，function。<br>网络状态上报，参数为callback函数，callback函数的参数：status表示网络状态，映射关系：未知：100，正常：0， 弱网：1， 断网：2|
| getNetworkType | 可选，function。如不传，默认从global.Hippy.bridge.callNativeWithPromise('NetInfo', 'getCurrentConnectivity')中采集。<br>网络类型上报，参数为callback函数，callback函数的参数：type表示网络状态，映射关系：未知：100，wifi：1， 2G：2， 3G: 3, 4G: 4, 5G: 5, 6G: 6|
| version | 可选，string，默认 sdk 版本号。<br>当前上报版本，当页面使用了pwa或者存在离线包时，可用来判断当前的上报是来自哪一个版本的代码，仅支持`字母数字.,:_-`，长度在 60 位以内 `/^[0-9a-zA-Z.,:_-]{1,60}$/` |
| reportImmediately | 可选，boolean，默认 true。<br>采集完数据后是否立即上报，默认为 true，如果设置为 false，则只采集数据，不触发数据上报，需要业务主动调用 aegis.ready() 方法才能触发上报，该参数一般用于业务有异步上报诉求的场景（例如预加载）。 |
| delay | 可选，number，默认 1000 ms。<br>上报节流时间，在该时间段内的上报将会合并到一个上报请求中。 |
| repeat | 可选，number，默认 5。<br>重复上报次数，对于同一个错误或者同一个接口测速超过多少次不上报。如果传入 repeat 参数为 0，则不限制。 |
| env | 可选，enum，默认 Aegis.environment.production。 <br> 当前项目运行所处的环境。｜
| api | 可选，object，默认为 {}。相关的配置: <br> apiDetail : 可选，boolean，默认false。api 失败的时候，是否上报 api 的请求参数和返回值; <br><br> retCodeHandler: Function(data: String, url: String, xhr: Object):{isErr: boolean, code: string}， 返回码上报钩子函数。 会传入接口返回数据,请求url和xhr对象; <br><br> reqParamHandler: Function(data: any, url: String) 上报请求参数的处理函数，可以对接口的请求参数进行处理，方便用户过滤上报请求参数的信息; <br><br> resBodyHandler: Function(data: any, url: String) 上报 response 返回 body 的处理函数，可以对接口返回值的 response body 进行处理，只上报关键信息;  <br><br> ret: 可选，string[]或string, 默认为['ret', 'retcode', 'code']。接口返回码key。<span id="jump">[见示例[1]](#exp1)</span><br><br> errCode: 可选，string[ ]或string,默认为[]。接口返回码value。如果http返回码存在于errCode中，则会认为此次请求失败并上报。[见示例[2]](#exp2)<br><br> code: 可选，string[]或string, 默认为['0']。接口返回码value。如果http返回码不存在于code中，则会认为此次请求失败并上报.[见示例[3]](#exp3)<br><br>如果配置了errCode或code，则不会使用默认值。|
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
