# aegis-web-sdk


Aegis 是腾讯云监控团队提供的前端监控 SDK，涵盖了错误监控，资源测速（img, script, css），接口测速，页面性能（首屏时间）。无需侵入代码，只需引入 SDK 即可自动完成所有监控上报。

在使用 aegis 时无需在业务代码中打点或者做任何其他操作，可以做到与业务代码充分解耦。aegis 将会自动监控前端错误，在错误发生时上报错误的具体情况，帮助您快速定位问题。当您开启资源测速时，aegis 将会自动监听页面资源加载情况（耗费时长、成功率等），并在不影响前端性能的前提下收集前端的性能数据，帮助您快速定位性能短板，提升用户体验。

使用本 SDK 需要配合使用腾讯云前端性能监控 [RUM 平台](https://console.cloud.tencent.com/rum)。

## Usage

1. 前往腾讯云前端性能监控 [RUM 平台](https://console.cloud.tencent.com/rum)

2. 申请项目，申请完成后得到`上报 id`，id 在 sdk 初始化的时候会使用。

Aegis SDK 在上报所有数据时都会带上`上报 id`，后端服务将根据`上报 id`辨别数据来自哪一个项目，因此，Aegis 建议为每一个项目都单独申请一个 id，如果一个项目下有多个页面，还可以为每一个页面都申请一个项目 id，方便单独查看每一个页面的 PV、错误率、请求错误率等数据。

aegis-sdk 默认使用 `https://aegis.qq.com` 作为上报域名，您也可以选择修改 hostUrl 参数使用 `https://rumt-zh.com` 作为上报域名。如果是腾讯内网用户，有特殊需求也可以使用 `https://aegis-report.woa.com` 作为上报域名。

## 使用SDK

### 安装 SDK

针对各种情况， SDK 提供了三种引入方式，选择适合业务中的一种即可。无论哪种使用方法，请务必保证 sdk 在 `<head></head>` 内，最先声明。这样能保证拿到各类数据监控。

1. cdn 引入

资源地址如下：

最新版本：https://tam.cdn-go.cn/aegis-sdk/latest/aegis.min.js

特定版本(注意链接中的版本号)：https://tam.cdn-go.cn/aegis-sdk/{version}/aegis.min.js

> 版本说明：为了保证CDN的稳定性，“latest” 版本将会比“npm”版本稍滞后一些；

安全身份识别版本：https://tam.cdn-go.cn/aegis-sdk/latest/aegis.f.min.js

> 功能说明：引入浏览器指纹算法，提升uv准确率；增强安全审计功能。

将会在 window 上挂载 `Aegis` 构造函数。

该 cdn 使用 “h3-Q050” 协议，默认 cache-control 为 max-age=666，如果需要修改 cache-control，可以添加参数 max_age，如

```html
<script src="https://tam.cdn-go.cn/aegis-sdk/latest/aegis.min.js?max_age=3600"></script>
```

2. npm 引入

```sh
$ npm install aegis-web-sdk
```

2. 内联引入

如果想要把 SDK 代码直接内联到 html 中的话，可以选择直接 copy 代码的方式，或者使用您熟悉打包工具的内联代码的工具


**推荐使用 CDN 的方式使用 aegis，可以享用更新更全的功能，更及时修复 bug，并且体验无感升级的快感。**
我们也会尽全力保证 CDN 版本的稳定，请您方便使用。

### SDK 实例化

引入 SDK 后，需实例化:

```javascript
// 如果使用 npm 可以直接 import
import Aegis from 'aegis-web-sdk';

// 如果使用 cdn 的话，Aegis 会自动绑定在 window 对象上
const aegis = new Aegis({
  id: 'pGUVFTCZyewxxxxx', // 项目上报id
  uin: 'xxx', // 用户唯一标识（可选）
  reportApiSpeed: true, // 接口测速
  reportAssetSpeed: true, // 静态资源测速
  spa: true, // spa 页面需要开启，页面切换的时候上报pv
});
```

::: warning 注意 ⚠️
为了不遗漏数据，须尽早进行初始化；
初始化之后，可以打开控制台查看上报接口是否正常，network 中搜索上报域名（默认 aegis.qq.com）查看上报数据情况。
如果上报接口返回 403 可以查看 [技术排查相关问题](https://cloud.tencent.com/document/product/1464/58608)。
:::

::: tip 当您做了以上接入工作之后，您已经开始享受 Aegis 提供的以下功能：
1、错误监控：JS执行错误、Promise错误、Ajax请求异常、资源加载失败、返回码异常、pv上报、白名单检测等；  
2、测速：页面性能测速、接口测速、静态资源测速；  
3、数据统计和分析：可在 [RUM 平台](https://console.cloud.tencent.com/rum) 上查看各个维度的数据分析；  
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
## aid

Aegis SDK 为每个用户设备分配的唯一标识，会存储在浏览器的 localStorage 里面，用来区分用户，计算 uv 等。aid 只有用户清理浏览器缓存才会更新。


对于一些项目，使用自己构造的 aid 作为上报规则，后端对 aid 的校验规则如下：`/^[@=.0-9a-zA-Z_-]{4,36}$/`

## 实例方法

Aegis 实例暴露接口简单实用，目前 Aegis 实例有以下方法供您使用：  
`setConfig` 、 `info` 、 `infoAll` 、 `report` 、 `error` 、 `reportEvent` 、 `reportTime` 、 `time` 、 `timeEnd`、 `destroy`

### setConfig

该方法用来修改实例配置，比如下面场景：  
在实例化 Aegis 时需要传入配置对象

```javascript
const aegis = new Aegis({
  id: 'pGUVFTCZyewxxxxx',
  uin: '777'
})
```

很多情况下，并不能一开始就获取到用户的 `uin`，而等获取到用户的 `uin` 才开始实例化 Aegis 就晚了，这期间发生的错误 Aegis 将监听不到。`uin` 的设置可以在获取到用户的时候：

```javascript
const aegis = new Aegis({
  id: 'pGUVFTCZyewxxxxx'
})

// 拿到uin之后...
aegis.setConfig({
  uin: '6666'
})
```

### info、infoAll、report、error

这三个方法是 Aegis 提供的主要上报手段。

```javascript
aegis.info('上报一条白名单日志，这两种情况这条日志才会报到后台：1、打开页面的用户在名单中；2、对应的页面发生了错误🤨');

aegis.infoAll('上报了一条日志，该上报与info唯一的不同就在于，所有用户都会上报');

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

### reportEvent

该方法可用来上报自定义事件，平台将会自动统计上报事件的各项指标，诸如：PV、平台分布等...

reportEvent 可以支持两种类型上报参数类型，一种是字符串类型

```javascript
aegis.reportEvent('XXX请求成功');
```

一种是对象类型，ext1 ext2 ext3 默认使用 new Aegis 的时候传入的参数，自定义事件上报的时候，可以覆盖默认值。

```javascript
aegis.reportEvent({
  name: 'XXX请求成功', // 必填
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
    name: 'onload', // 自定义测速名称
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

### destroy

该方法用于销毁 sdk 实例，销毁后，不再进行数据上报

```javascript
aegis.destroy();
```

## 白名单

白名单功能是适用于开发者希望对某些特定的用户上报更多的日志，但是又不希望太多上报来影响到全部日志数据，并且减少用户的接口请求次数，因此 TAM 设定了白名单的逻辑。

1. 白名单用户会上报全部的 API 请求信息，包括接口请求和请求结果。
2. 白名单用户可以使用 info 接口上报数据。
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
    if (data.logType === 'performance') {
      // 修改：将性能数据的首屏渲染时间改为2s
      data.logs.firstScreenTiming = 2000;
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
Aegis 的实例在初始化之后会自动进行以下监控
1. JS执行错误
2. Promise执行错误
3. 资源加载失败

开启 `reportApiSpeed` 参数后，会自动监听以下异常
1. Ajax（Fetch）请求异常
2. retcode异常

开启 `websocketHack` 参数后，会自动监听 websocket 执行异常

注意！是 Aegis 实例会进行监控，当您只是引入了 SDK 而没有将其实例化时，Aegis 将什么都不会做。
:::

### JS执行错误

Aegis 通过监听 `window` 对象上的 `onerror` 事件来获取项目中的报错，并且通过解析错误和分析堆栈，将错误信息自动上报到后台服务中。该上报的上报等级为 error ，所以，当自动上报的错误达到阈值时，Aegis 将会自动告警，帮助您尽早发现异常。由于上报等级为 error ，自动上报也将影响项目的评分。
> 如果页面上引入了跨域的JS脚本，需要给对应的 `script` 标签添加 `crossorigin` 属性，否则 Aegis 将无法获取详细的错误信息，参考 [这篇文章](http://km.oa.com/group/11800/articles/show/386426)

注意如果用户使用的是 vue 框架，请务必自己获取错误并且主动上报

```javascript
Vue.config.errorHandler = function(err, vm, info) {
  console.log(`Error: ${err.toString()}\nStack: ${err.stack}\nInfo: ${info}`);
  aegis.error(`Error: ${err.toString()}\nStack: ${err.stack}\nInfo: ${info}`);
};
```

### Promise执行错误

通过监听 `unhandledrejection` 事件，捕获到未被 `catch` 的Promise错误，为了页面的健壮，建议您 `catch` 住所有的Promise错误哟。

### 资源加载失败

页面元素发出的请求如果失败，将会被 `window.onerror` 事件捕获到（捕获阶段），Aegis 正是通过这个特性监听的资源加载失败。Aegis监听了以下资源：  

1. `<link>` 标签请求的css、font等；
2. `<script>` 标签请求的脚本；
3. `<audio>`、`<video>` 标签请求的多媒体资源；

### Ajax（Fetch）请求异常

当用户开启 `reportApiSpeed` 参数后，Aegis 将会改写 `XMLHttpRequest` 对象和 `fetch` 对象，监听每次接口请求，Aegis 认为以下情况是异常情况：

1. `http status` 大于等于 400
2. 请求超时，abort，跨域，cancel
3. 请求结束时 `http status` 仍然是 0，通常发生于请求失败

注意： Aegis SDK 在错误发生的时候，不会主动收集接口请求参数和返回信息，如果需要对进口信息进行上报，可以使用 api 参数里面的 apiDetail 进行开启。

```javascript
new Aegis({
  id: '',
  reportApiSpeed: true,
  api: {
    apiDetail: true,
  },
});
```

### retcode异常

当用户开启 `reportApiSpeed` 参数后 Aegis 改写 `XMLHttpRequest` 对象和 `fetch` 对象，将获得API返回的内容，并尝试在内容中获取到本次请求的 `retcode`。

> retcode 的值会从用户返回 response body 的第一层（如果第一层取不到，再取第二层）的 code、ret、retcode、errcode 中获取。
> Aegis 默认 retcode 的值为0是正常的，非0都是异常的。当 `retcode` 发生异常的时候，会上报一个 retcode异常的日志。
> 用户可以通过 api.retCodeHandler 对这个值和是否异常进行修正。

### websocket异常

Aegis 默认不会对全局 websocket 对象进行重写，默认不会监控 websocket 相关错误，如果需要打开相关功能可以在创建 Aegis 对象时设置 `websocketHack: true`。
```javascript
new Aegis({
  id: '',
  websocketHack: true
});
```

## 性能监控

### 页面测速

> 打开方式：默认开启  

Aegis 实例默认会上报以下指标：  

**1. DNS查询**：domainLookupEnd - domainLookupStart；  
**2. TCP连接**：connectEnd - connectStart；  
**3. SSL建连**：requestStart - secureConnectionStart；  
**4. 请求响应**：responseStart - requestStart；  
**5. 内容传输**：responseEnd - responseStart；  
**6. DOM解析**：domInteractive - domLoading；  
**7. 资源加载**：loadEventStart - domInteractive；  
**8. 首屏耗时**：监听页面打开3s内的 **首屏** DOM 变化，并认为 DOM 变化数量最多的那一刻为首屏框架渲染完成时间（sdk初始化后setTimeout 3s收集首屏元素，由于js是在单线程环境下执行，收集时间点可能大于3s，如果第一次3s内无法获取首屏，将会继续计算下一次3s内的元素变化，且只会再计算一次）；  
**9. 页面完加载时间**： 为前面7项数据之和；  

> 前7项计算材料从 [PerformanceTiming](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timing) 获取。首屏耗时对应的 dom 元素，可以通过打印 aegis.firstScreenInfo 查看。如果 dom 元素不能代表首屏，可以添加属性 \<div `aegis-first-screen-timing`\>\<\/div\>，把某个元素识别为首屏关键元素，SDK 认为只要用户首屏出现此元素就是首屏完成。也可以添加属性 \<div `aegis-ignore-first-screen-timing`\>\<\/div\>，把该 dom 列入黑名单。

根据以上数据，TAM 为用户绘制了页面加载瀑布图

![页面加载瀑布图](https://nowpic.gtimg.com/feeds_pic/kZXyd7Yh5phaicL6rEVF6T6WqpmEnWrABkff3anQHeGs/)

> 在服务端直出场景，瀑布图会出现首屏时间大于dom解析的情况，这是由于移动端设备兼容性问题，有些设备无法获取到DNS查询、TCP连接、SSL建连时间，这三个指标汇总后的平均值偏小，导致除了首屏时间外的其他指标都往左偏移。

### 接口测速

> 打开方式：初始化时传入配置 `reportApiSpeed: true`  

Aegis 通过劫持 `XHR` 及 `fetch` 进行接口测速，具体代码在 [这里](https://git.woa.com/tam/aegis-sdk/blob/master/packages/web-sdk/src/plugins/cgi-speed.ts)

### 资源测速

> 打开方式：初始化时传入配置 `reportAssetSpeed: true`  

Aegis 通过浏览器提供的 `PerformanceResourceTiming` 进行资源测速，具体代码在 [这里](https://git.woa.com/tam/aegis-sdk/blob/master/packages/web-sdk/src/plugins/asset-speed.ts)

### jsBridge 接口测速

Aegis 通过劫持业务中使用的 jsBridge 对象及相关方法来进行bridge接口测速。
> 打开方式：初始化时传入配置:
`reportBridgeSpeed: true;`
`h5Bridge: h5BridgeObj`
`h5BridgeFunc: ['func1', 'func2']`

bridge接口测速是sdk对h5Bridge对象上的h5BridgeFunc进行拦截并重写，这个h5Bridge对象需要由业务自定义传入（通常为客户端挂载在window对象上的jsBridge对象），h5BridgeFunc表示需要拦截并重写的h5Bridge上具体的方法列表。

## 环境控制

> aegis 默认把数据所在环境当作 `production` 进行上报，如果您有自助修改的需求的话，可以使用 env 参数进行修改。

```javascript
new Aegis({
  id: '',
  env: Aegis.environment.gray
})
```

Aegis.environment 枚举值如下

```javascript
export enum Environment {
  production = 'production', // 生产环境
  gray = 'gray', // 灰度环境
  pre = 'pre', // 预发布环境
  daily = 'daily', // 日发布环境
  local = 'local', // 本地环境
  test = 'test', // 测试环境
  others = 'others' // 其他环境
}
```

修改 env 参数后，aegis 上报的数据都会带上该参数，方便开发者区分不同环境的数据，但是只有 production 环境的数据会参与项目得分的计算。


## 离线日志

Aegis SDK 使用 [flog](https://git.woa.com/TAM/tam-flog) 管理离线日志，用户只需要简单配置就可以使用

1. 在 SDK 中开启离线日志参数

```javascript
new Aegis({
  id: '', // 用户在TAM平台上申请的上报key
  uin: 'xxxx', // 必须有 uin 才可以上报离线日志，如果一开始获取不到，后面可以通过 setConfig 设置
  offlineLog: true, // 开启离线日志
})
```

离线日志开启后，用户的日志就会被收集到浏览器的 IndexedDB 中，但是并不会实时上报，需要开发者对用户 uin

2. 打开开发者平台对该用户进行监听

![监听用户](https://nowpic.gtimg.com/feeds_pic/PiajxSqBRaEJRHgqJawVuiaABmYJaPEE4DnLUicjRzSPHlyAnv8IpaTnw/)

3. 当用户下次打开页面或者代码中执行 setConfig 的时候，用户将日志上报到 TAM 服务端

这个时候，用户侧会发两个接口，一个是 `aegis.qq.com/offline/offlineAuto`，用来判断是否要发送离线日志，并且返回加密 token
一个是 `aegis.qq.com/offline/offlineLog`，用来上报当前用户 indexedDB 中存放的离线日志

4. 查看日志

![查看离线日志](https://nowpic.gtimg.com/feeds_pic/PiajxSqBRaELPvEiawiaQdBfibvib9icdqkQaovltMyHaWN9q2FH8NEPGAtw/)

<!-- ## 全链路监控

v1.24.2 版本，Aegis联手天机阁，推出全链路日志 🤨

### 全链路方案

![方案图](https://nowpic.gtimg.com/feeds_pic/PiajxSqBRaEJJD7H3plAeobSMM9SfibSc147y5FrgrwhhQpLcuYhBDRA/) -->

<!-- ### 接入工作

#### 前端

打开 Aegis 天机阁插件，Aegis 将自动在页面发出请求时生成 `trace_id`、`span_id`，并以一定规则加工，
并塞到请求头 `X-Tjg-Json-Span-Context` 中。

```javascript
// 只监控同源API
new Aegis({
  // ...
  tjg: true, 
  // ...
})
// 监控所有API（注意：非同源接口添加额外的请求头将导致跨域！！）
new Aegis({
  // ...
  tjg: {
    crossOrigin: true,
  }, 
  // ...
})
```

#### 后端

🦸🏻‍♂️ 接入 [天机阁](http://tjg.oa.com/#/) ，从请求头 `X-Tjg-Json-Span-Context` 中获取到 `trace_id`、`span_id`，
并作为主调进行上报。 -->

## 浏览器指纹

Aegis指纹版SDK使用浏览器指纹算法作为用户唯一标识aid，提升uv准确率；用户通过引用指纹版Aegis SDK就可以使用

1. 引入指纹版SDK

cdn 引入

```html
<script src="https://tam.cdn-go.cn/aegis-sdk/latest/aegis.f.min.js"></script>
```

npm 引入：  

```sh
$ npm install aegis-web-sdk
```

```javascript
import Aegis from '@tencent/aegis-web-sdk/lib/aegis.f.min';
```

> 备注：version > 1.38.56

2. 查看uv

![监听用户](https://tam-1258344699.cos.ap-guangzhou.myqcloud.com/tam-image/%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E6%88%AA%E5%9B%BE_d3fafaa2-6511-423f-8577-851d77a39ee1.png)

3. 更多应用场景

与此同时，配合业务场景进行技术赋能，可以扩展出更多能力。如安全部门基于指纹SDK扩展出安全审计功能等。

4. 指纹算法简介

人的指纹千变万化，具有唯一性，可以作为人的身份标识。类似的，浏览器指纹是通过获取浏览器具有辨识度的信息，进行一些计算得出一个值，那么这个值就是浏览器指纹。

浏览器指纹是由许多浏览器的特征信息综合起来的，其中特征值的信息熵也不尽相同。因此，指纹也分为基本指纹和高级指纹。**基本指纹**是任何浏览器都具有的特征标识，比如硬件类型（Apple）、操作系统（Mac OS）、用户代理（User agent）、系统字体、语言、屏幕分辨率、浏览器插件 (Flash, Silverlight, Java, etc)等众多信息，这些指纹信息“类似”人类的身高、年龄等，有很大的冲突概率，只能作为辅助识别。普通指纹是不够区分独特的个人，这时就需要**高级指纹**，将范围进一步缩小，甚至生成一个独一无二的浏览器身份。常见的有：Canvas指纹、Webgl指纹、audio指纹等。

在指纹版Aegis SDK中，也引入了多种业界成熟的基础/高级指纹，设备识别准确度的提升显著。我们以Canvas为例，来展开介绍下指纹算法的实现思路。

由于系统的差别，Canvas底层的图形渲染引擎不同，对抗锯齿、次像素渲染等算法也不同；我们通过在画布上渲染一些文字，再用 toDataURL 转换输出一段字符串，这就生成了代表设备唯一标识的指纹信息。

```javascript
function getCanvasFingerprint () {    
    var canvas = document.createElement('canvas');    
    var context = canvas.getContext("2d");    
    context.font = "18pt Arial";    
    context.textBaseline = "top";    
    ctx.fillText('aegis,sdk <canvas> 1.0', 2, 15);
    return canvas.toDataURL("image/jpeg");
}
```
当然，canvas指纹也有一定的概率发生重复，比如两个设备配置一样时，他们的canvas指纹也是一样的。所以我们还需要结合其他多种指纹算法，生成联合指纹信息串，来将指纹唯一性提升到极致。

> 指纹算法在持续迭代优化中，如需讨论和共建请联系`oliverfan`

## 兼容ie8

Aegis 提供了兼容 `ie8` 的版本啦 🤟🏻🤟🏻
> tnpm 包版本需大于 `1.23.45`  
> cdn 暂未提供，急需请联系 `pumpkincai` 上架

### 安装

```bash
tnpm install --save @tencent/aegis-web-sdk
```

### 使用

```javascript
import Aegis from '@tencent/aegis-web-sdk/lib/aegis.ie.min.js';

function isIE() {
  // 浏览器判断
  // ie return false
  // 非ie return true
}

const aegis = new Aegis({
  id: 'pGUVFTCZyewxxxxx',
  uin: 'xxxx',
  ie: isIE(), // 打开ie布丁插件
  reportAssetSpeed: !isIE(), // ie暂不支持测速
  reportApiSpeed: !isIE(), // ie暂不支持测速
  offlineLog: !isIE(), // ie不支持离线日志
  onError: !isIE(), // 关闭高版本错误监控
  pagePerformance: !isIE(), // 关闭默认打开的页面测速（ie暂不支持）
});
```

### TIPS

`ie8` 版本的 SDK 跟普通的对比，多了非常多的 polyfill 以及ie专用插件，所以体积稍大（gzip 24kb）。

## 配置文档

| 配置 | 描述 |
| -------- | -------- |
| id | 必须，string，默认 无。<br>开发者平台分配的项目ID |
| uin | 建议，string，默认取 cookie 中的 uin 字段。<br>业务定义的当前用户的唯一标识符，用来查找固定用户的日志。白名单上报时将根据该字段判定用户是否在白名单中，字段仅支持`字母数字@=._-`，正则表达式: `/^[@=.0-9a-zA-Z_-]{1,60}$/` |
| reportApiSpeed | 可选，boolean 或者 <span id="jump">[object](#exp2)</span>，默认 false。<br>是否开启接口测速 |
| reportBridgeSpeed | 可选，boolean，默认 false。<br>是否开启 jsbridge 监控上报 |
| reportAssetSpeed | 可选，boolean，默认 false。<br>是否开启静态资源测速 |
| pagePerformance | 可选，boolean 或者 <span id="jump">[object](#exp3)</span>，默认 true。<br>是否开启页面测速 |
| webVitals | 可选，boolean，默认 true。<br>是否开启 web vitals 测速 |
| onError | 可选，boolean，默认 true。<br>当前实例是否需要进行错误监听，获取错误日志 |
| aid | 可选，boolean，默认 true。<br>当前实例是否生成aid |
| random | 可选，number，默认 1。<br>0~1 抽样率 |
| spa | 可选，boolean，默认 false。 <br> 当前页面是否是单页应用？true的话将会监听hashchange及history api，在页面跳转时进行pv上报 |
| pageUrl | 可选。默认是 location.href。 <br> 修改上报数据中页面地址，开发者可以主动对数据进行聚合和降低维度 ｜
| urlHandler | 可选，Function。 <br> 动态修改上报数据中页面地址 from，可以配合 pageUrl 参数使用 <span id="jump">[见示例[5]](#exp5)</span> ｜
| version | 可选，string，默认 sdk 版本号。<br>当前上报版本，当页面使用了pwa或者存在离线包时，可用来判断当前的上报是来自哪一个版本的代码，仅支持`字母数字.,:_-`，长度在 60 位以内 `/^[0-9a-zA-Z.,:_-]{1,60}$/` |
| reportImmediately | 可选，boolean，默认 true。<br>采集完数据后是否立即上报，默认为 true，如果设置为 false，则只采集数据，不触发数据上报，需要业务主动调用 aegis.ready() 方法才能触发上报，该参数一般用于业务有异步上报诉求的场景（例如预加载）。 |
| delay | 可选，number，默认 1000 ms。<br>上报节流时间，在该时间段内的上报将会合并到一个上报请求中。 |
| repeat | 可选，number，默认 5。<br>重复上报次数，对于同一个错误或者同一个接口测速超过多少次不上报。如果传入 repeat 参数为 0，则不限制。 |
| env | 可选，enum，默认 Aegis.environment.production。 <br> 当前项目运行所处的环境。｜
| websocketHack | 可选，boolean，默认 false <br>是否开启websocket监控。 |
| offlineLog | 可选，boolean，默认 false。<br>是否使用离线日志 |
| offlineLogExp | 可选，number，默认 3。<br>离线日志过期天数 |
| api | 可选，object，默认为 {}。相关的配置:  <br> apiDetail : 可选，boolean，默认false。上报 api 信息的时候，是否上报 api 的请求参数和返回值; <br><br> retCodeHandler: Function(data: String, url: String, xhr: Object):{isErr: boolean, code: string}， 返回码上报钩子函数。 会传入接口返回数据,请求url和xhr对象; <br><br> reqParamHandler: Function(data: any, url: String) 上报请求参数的处理函数，可以对接口的请求参数进行处理，方便用户过滤上报请求参数的信息; <br><br> resBodyHandler: Function(data: any, url: String) 上报 response 返回 body 的处理函数，可以对接口返回值的 response body 进行处理，只上报关键信息; <br><br> reqHeaders: Array 需要上报的 http 请求 request headers 列表。 <br><br> resHeaders: Array 需要上报的 http 请求 response headers 列表。 如果开发者需要获取的字段非 “simple response header”，需要给在返回头中给字段添加 Access-Control-Expose-Headers <br><br> resourceTypeHandler: Function，请求资源类型修正钩子函数 会传入接口url，返回值为‘static’或‘fetch’。<span id="jump">[见示例[1]](#exp1)</span> <br><br> reportRequest: boolean, 默认为false。 开启aegis.info全量上报, 不需要白名单配置。并上报所有接口请求信息（请开启reportApiSpeed）<br><br> usePerformanceTiming: boolean，默认为false。aegis sdk 默认使用打点的方式计算接口耗时，该方式在移动端存在一些误差，开启 usePerformanceTiming 后，aegis sdk 会从 performance 中重新获取接口耗时，让接口耗时统计更为准确。需要注意的是，开启该参数的前提是用户业务接口请求 url 是独立且唯一的，用户可以在接口请求 url 中添加时间戳等方式来保证 url 唯一性。如果 url 不唯一，可能导致同 url 接口耗时获取错误。<br><br> injectTraceHeader: 可选，string，且必须为枚举值 'traceparent' | 'sw8' | 'b3' | 'sentry-trace' 中的一种，开启该参数后，Aegis 会在用户请求头中注入相关 trace header。<br><br> injectTraceUrls: 可选，Array, 数组中传入 string 或者 RegExp。标记哪些请求 url 需要注入 trace 请求头。 <br><br> injectTraceIgnoreUrls: 可选，Array, 数组中传入 string 或者 RegExp。标记哪些请求 url 不需要注入 trace 请求头。|
| speedSample | 可选，boolean，默认 true。<br>测速日志是否抽样（限制每条url只上报一次测速日志） |
| hostUrl | 可选，默认是 `https://aegis.qq.com`。<br>影响全部上报数据的 host 地址，下面几个 url 地址设置后会覆盖对应的上报地址 |
| url | 可选，string，默认 'https://aegis.qq.com/collect'。<br>日志上报地址 |
| pvUrl | 可选，string, 默认 'https://aegis.qq.com/collect/pv' <br> pv 上报地址 ｜
| whiteListUrl | 可选，string，默认 'https://aegis.qq.com/collect/whitelist'。<br>白名单确认接口 <br>如果想要关闭白名单接口请求，可以传空字符串|
| offlineUrl | 可选，string，默认 'https://aegis.qq.com/collect/offline'。<br> 离线日志上报地址 |
| eventUrl | 可选，string，默认 'https://aegis.qq.com/collect/events'。<br> 自定义事件上报地址 |
| speedUrl | 可选，string，默认 'https://aegis.qq.com/speed'。<br>测速日志上报地址 |
| customTimeUrl | 可选，string，默认 'https://aegis.qq.com/speed/custom'。<br>自定义测速上报地址 |
| performanceUrl | 可选，string，默认 'https://aegis.qq.com/speed/performance'。<br>页面性能日志上报地址 |
| webVitalsUrl | 可选，string，默认 'https://aegis.qq.com/speed/webvitals'。 <br> webvitals 上报地址 |
| dbConfig | 可选，Object，参考地址：https://git.woa.com/vasdev/web_webpersistance_v2 （配置 params）|
| ext1 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |
| ext2 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |
| ext3 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |

### 示例


**[1] api.retCodeHandler**<span id="exp1"></span>，假如后台返回数据为:
```json
{
  body: {
    code: 200,
    retCode: 0,
    data: {
      // xxx
    }
  }
}

```

业务需要：code不为200，或者retCode不为0，此次请求就是错误的。此时只需进行以下配置：

```javascript
new Aegis({
  // xxx
  reportApiSpeed: true, // 需要开两个，不然不会有返回码上报
  reportAssetSpeed: true,
  api: {
    // 注意，此处如果用在ie低版本里面，不能用retCodeHandler(){}这种写法，ie不支持
    retCodeHandler: function(data, url, xhr) { 
      // 注意这里的 data 的数据类型，跟接口返回值的数据类型一致，开发者需要根据实际情况自行处理
      // fetch 请求的时候，data 是 string，如果需要对象需要手动 parse 下
      // xhr 请求的时候，data 是 xhr.response 拿到完整的后台响应
      try {
        data = JSON.parse(data)
      } catch(e) {}
      return {
        isErr: data.body.code !== 200 || data.body.retCode !== 0,
        code:  data.body.code
      }
    }
  }
})
```

**api.resourceTypeHandler**，假如接口  

`http://example.com/test-api`  

返回的 `Content-Type` 为 `text/html`，这将导致 Aegis 认为该接口返回的是静态资源，可以通过以下方法修正：

```javascript
new Aegis({
  reportApiSpeed: true, // 需要开两个，不然不会有返回码上报
  reportAssetSpeed: true,
  api: {
    resourceTypeHandler: function(url) {
      if (url?.indexOf('http://example.com/test-api') != -1) {
        return 'fetch';
      }
    }
  }
})
```

**[2] reportApiSpeed.urlHandler**<span id="exp2"></span>，假如您页面中有restful风格的接口，如：  
*www.example.com/user/1000*  
*www.example.com/user/1001*

在上报测速时需要将这些接口聚合：

```javascript
new Aegis({
  // xxx
  reportApiSpeed: {
    urlHandler(url, payload) {
      if ((/www\.example\.com\/user\/\d*/).test(url)) {
        return 'www.example.com/user/:id';
      }
      return url;
    }
  }
  // xxx
})
```

**[3] pagePerformance.urlHandler**<span id="exp3"></span>，假如您的页面url是restful风格的，如：  
*www.example.com/user/1000*  
*www.example.com/user/1001*

在上报页面测速时需要将这些页面地址聚合：

```javascript
new Aegis({
  // xxx
  pagePerformance: {
    urlHandler() {
      if ((/www\.example\.com\/user\/\d*/).test(window.location.href)) {
        return 'www.example.com/user/:id';
      }
    }
  }
  // xxx
})
```


**[4] pagePerformance.firstScreenInfo**<span id="exp4"></span>，默认值为 false，如果需要在内存中保留 aegis.firstScreenInfo 对象，可以通过设置改值为 true 来实现。

```javascript
new Aegis({
  // xxx
  pagePerformance: {
    firstScreenInfo： true
  }
  // xxx
})
```


**[5] urlHandler**<span id="exp5"></span>，修改上报接口中的 from 参数，用来降低页面地址的维度信息，避免维度限制导致用户数据丢失。按优先级从urlHandler/pageUrl/location.href 获取，默认为location.href。

该方法既可以减少一些敏感信息，又可以全体上报数据的整体维度信息。

```javascript
new Aegis({
  pageUrl: location.href,
  urlHandler() {
    // 比如页面地址为 'aaaa.com/123123/user'，通过下面的修改后会变成 aaa.com/*/user
    return location.href.replace(/\d+\//, '*')
  }
})
```