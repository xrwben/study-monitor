# aegis-cocos-sdk


Aegis 是腾讯云监控团队提供的前端监控 SDK，涵盖了错误监控，资源测速（img, script, css），接口测速，页面性能（首屏时间）。无需侵入代码，只需引入 SDK 即可自动完成所有监控上报。

在使用 aegis 时无需在业务代码中打点或者做任何其他操作，可以做到与业务代码充分解耦。aegis 将会自动监控前端错误，在错误发生时上报错误的具体情况，帮助您快速定位问题。当您开启资源测速时，aegis 将会自动监听页面资源加载情况（耗费时长、成功率等），并在不影响前端性能的前提下收集前端的性能数据，帮助您快速定位性能短板，提升用户体验。

使用本 SDK 需要配合使用腾讯云前端性能监控 [RUM 平台](https://console.cloud.tencent.com/rum)。

## Usage

1. 前往腾讯云前端性能监控 [RUM 平台](https://console.cloud.tencent.com/rum)

2. 申请项目，申请完成后得到`上报 id`，id 在 sdk 初始化的时候会使用。

Aegis SDK 在上报所有数据时都会带上`上报 id`，后端服务将根据`上报 id`辨别数据来自哪一个项目，因此，Aegis 建议为每一个项目都单独申请一个 id，如果一个项目下有多个页面，还可以为每一个页面都申请一个项目 id，方便单独查看每一个页面的 PV、错误率、请求错误率等数据。

## 使用SDK

### NPM

在项目支持 NPM 时推荐使用 NPM 安装 Aegis SDK。

```bash
$ npm install aegis-cocos-sdk
```

### SDK 实例化

引入 SDK 后，需实例化:

```javascript
import Aegis from 'aegis-cocos-sdk';

const aegis = new Aegis({
  id: 'pGUVFTCZyewxxxxx',
  uin: 'xxx', // 用户唯一标识（可选）
  reportApiSpeed: true, // 接口测速
  reportAssetSpeed: true // 静态资源测速
});
```

::: warning 注意 ⚠️
为了不遗漏数据，须尽早进行初始化；
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


### aid

Aegis SDK 为每个用户设备分配的唯一标识，会存储在浏览器的 localStorage 里面，用来区分用户，计算 uv 等。aid 只有用户清理浏览器缓存才会更新。

算法如下:

```javascript
async getAid(callback: Function) {
// 某些情况下操作 localStorage 会报错.
  try {
    let aid = await localStorage.getItem('AEGIS_ID');
    if (!aid) {
    aid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    localStorage.setItem('AEGIS_ID', aid);
    }
    callback?.(aid || '');
  } catch (e) {
    callback?.('');
  }
}
```

对于一些项目，使用自己构造的 aid 作为上报规则，后端对 aid 的校验规则如下：`/^[@=.0-9a-zA-Z_-]{4,36}$/`

## 实例方法

Aegis 实例暴露接口简单实用，目前 Aegis 实例有以下方法供您使用：  
`setConfig` 、 `info` 、 `infoAll` 、 `report` 、 `error` 、 `reportEvent` 、 `reportTime` 、 `time` 、 `timeEnd`、`retcode`、`destroy`

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
```

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
});
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

### retcode

该方法可用来上报自定义接口的返回码，同时支持接口测速上报，例如：

```javascript
aegis.retcode({
  ret:0,
  url:'myCocosApi'
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
Aegis 的实例会自动进行以下监控，注意！是 Aegis 实例会进行监控，当您只是引入了 SDK 而没有将其实例化时，Aegis 将什么都不会做。
:::

### JS执行错误

Aegis 通过监听 `window` 对象上的 `onerror` 事件来获取项目中的报错，并且通过解析错误和分析堆栈，将错误信息自动上报到后台服务中。该上报的上报等级为 error ，所以，当自动上报的错误达到阈值时，Aegis 将会自动告警，帮助您尽早发现异常。由于上报等级为 error ，自动上报也将影响项目的评分。
> 如果页面上引入了跨域的JS脚本，需要给对应的 `script` 标签添加 `crossorigin` 属性，否则 Aegis 将无法获取详细的错误信息。

注意如果用户使用的是 vue 框架，请务必自己获取错误并且主动上报

```javascript
Vue.config.errorHandler = function(err, vm, info) {
    console.log(`Error: ${err.toString()}\nInfo: ${info}`);
    aegis.error(`Error: ${err.toString()}\nInfo: ${info}`);
};
```

#### Script error

Script error. 也被称为跨域错误，当网站请求并且执行一个非本域名下的脚步的时候，如果跨域脚本发生错误，就有可能抛出这个错误。由于项目中，我们的脚本都是放在 CDN 上的，因此这种错误最为常见。

其实这并不是一个JavaScript Bug。出于安全考虑，浏览器会刻意隐藏其他域的JS文件抛出的具体错误信息，这样做可以有效避免敏感信息无意中被不受控制的第三方脚本捕获。因此，浏览器只允许同域下的脚本捕获具体错误信息，而其他脚本只知道发生了一个错误，但无法获知错误的具体内容。更多信息，请参见 [Webkit源码](https://trac.webkit.org/browser/branches/chromium/648/Source/WebCore/dom/ScriptExecutionContext.cpp?spm=a2c63.p38356.879954.4.35155db7eUvHNi&file=ScriptExecutionContext.cpp#L294)。


### Promise执行错误

通过监听 `unhandledrejection` 事件，捕获到未被 `catch` 的Promise错误，为了页面的健壮，建议您 `catch` 住所有的Promise错误哟。

### Ajax（Fetch）请求异常

Aegis 将会改写 `XMLHttpRequest` 对象，监听每次接口请求，Aegis 认为以下情况是异常情况：  
1. `http status` 大于 400
2. 请求超时
3. 请求结束时 `http status` 仍然是 0，通常发生于请求失败

### 返回码异常

同上，Aegis 改写 `XMLHttpRequest` 对象之后，将获得API返回的内容，并尝试在内容中获取到本次请求的 `retcode`，
当 `retcode` 不符合预期的时候，会认为本次请求出现了异常，并进行上报。
> 如何获取 `retcode` 以及哪些`retcode` 是正常的可以在配置文档中查看。

## 性能监控

### 接口测速

> 打开方式：初始化时传入配置 `reportApiSpeed: true`

Aegis 通过劫持 `fetch` 进行接口测速，具体代码在 [cgi-speed](https://git.woa.com/TAM/aegis-sdk/blob/feat/cocos/packages/cocos-sdk/src/plugins/cgi-speed.ts)

### 资源测速

> 打开方式：初始化时传入配置 `reportAssetSpeed: true`

Aegis 通过劫持 `cc.loader.load`, `cc.loader.loadRes`, `cc.assetManager.loadRemote` 进行接口测速，具体代码在 [cgi-speed](https://git.woa.com/TAM/aegis-sdk/blob/feat/cocos/packages/cocos-sdk/src/plugins/asset-speed.ts)

### fps/drawcall监控

> 打开方式：初始化时传入配置 `fpsReportInterval: true | number`

Aegis 通过会定时获取fps/drawcall数据，定时进行上报

### 首屏监控
鉴于cocos中一般会有loading态用来预加载资源，首屏计算时间一般是在去掉loading后自行上报，参数可选

```javascript
// 1、调用后自动获取时间上报
aegis.reportFirstScreenTime();

// 2、自定义时间上报
aegis.reportFirstScreenTime(1000);
```

## 配置文档

| 配置 | 描述 |
| -------- | -------- |
| id | 必须，string，默认 无。<br>开发者平台分配的项目ID |
| uin | 建议，string，默认取 cookie 中的 uin 字段。<br>当前用户的唯一标识符，白名单上报时将根据该字段判定用户是否在白名单中，字段仅支持`字母数字@=._-`，正则表达式: `/^[@=.0-9a-zA-Z_-]{1,60}$/` |
| reportApiSpeed | 可选，boolean 或者 <span id="jump">[object](#exp2)</span>，默认 false。<br>是否开启接口测速 |
| reportAssetSpeed | 可选，boolean，默认 false。<br>是否开启静态资源测速 |
| pagePerformance | 可选，boolean 或者 <span id="jump">[object](#exp3)</span>，默认 true。<br>是否开启页面测速 |
| spa | 可选，boolean ，默认 true。<br>是否单场景应用 |
| fpsReportInterval | 可选，boolean 或 number ，默认 为false。<br>fps上报间隔，当设为true时默认为60s, 为number时，使用自定义number,单位为秒 |
| onError | 可选，boolean，默认 true。<br>当前实例是否需要进行错误监听，获取错误日志 |
| aid | 可选，boolean，默认 true。<br>当前实例是否生成aid |
| random | 可选，number，默认 1。<br>0~1 抽样率 |
| spa | 可选，boolean，默认 false。 <br> 当前页面是否是单页应用？true的话将会监听hashchange及history api，在页面跳转时进行pv上报 |
| version | 可选，string，默认 sdk 版本号。<br>当前上报版本，当页面使用了pwa或者存在离线包时，可用来判断当前的上报是来自哪一个版本的代码，仅支持`字母数字.,:_-`，长度在 60 位以内 `/^[0-9a-zA-Z.,:_-]{1,60}$/` |
| delay | 可选，number，默认 1000 ms。<br>上报节流时间，在该时间段内的上报将会合并到一个上报请求中。 |
| repeat | 可选，number，默认 5。<br>重复上报次数，对于同一个错误超过多少次不上报。 |
| env | 可选，enum，默认 Aegis.environment.production。 <br> 当前项目运行所处的环境。｜
| api | 可选，object，默认为{}。相关的配置:  <br><br> apiDetail : 可选，boolean，默认false。上报 api 信息的时候，是否上报 api 的请求参数和返回值; <br><br> retCodeHandler: Function(data: String, url: String, xhr: Object):{isErr: boolean, code: string}， 返回码上报钩子函数。 会传入接口返回数据,请求url和xhr对象 <br><br> reqParamHandler: Function(data: any, url: String) 上报请求参数的处理函数，可以对接口的请求参数进行处理，方便用户过滤上报请求参数的信息; <br><br> resBodyHandler: Function(data: any, url: String) 上报 response 返回 body 的处理函数，可以对接口返回值的 response body 进行处理，只上报关键信息;<br><br> resourceTypeHandler: Function，请求资源类型修正钩子函数 会传入接口url，返回值为‘static’或‘fetch’。<span id="jump">[见示例[1]](#exp1)</span><br><br>reportRequest: boolean, 默认为false。 开启aegis.info全量上报, 不需要白名单配置。并上报所有接口请求信息（请开启reportApiSpeed） |
| speedSample | 可选，boolean，默认 true。<br>测速日志是否抽样（限制每条url只上报一次测速日志） |
| hostUrl | 可选，默认是 `aegis.qq.com`。<br>影响全部上报数据的 host 地址，下面几个 url 地址设置后会覆盖对应的上报地址 ｜
| url | 可选，string，默认 '//aegis.qq.com/collect'。<br>日志上报地址 |
| pvUrl | 可选，string, 默认 '//aegis.qq.com/collect/pv' <br> pv 上报地址 ｜
| whiteListUrl | 可选，string，默认 '//aegis.qq.com/collect/whitelist'。<br>白名单确认接口 <br>如果想要关闭白名单接口请求，可以传空字符串|
| eventUrl | 可选，string，默认 '//aegis.qq.com/collect/events'。<br> 自定义事件上报地址 |
| speedUrl | 可选，string，默认 '//aegis.qq.com/speed'。<br>测速日志上报地址 |
| customTimeUrl | 可选，string，默认 '//aegis.qq.com/speed/custom'。<br>自定义测速上报地址 |
| performanceUrl | 可选，string，默认 '//aegis.qq.com/speed/performance'。<br>页面性能日志上报地址 |

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
  reportApiSpeed: true, // 需要开两个，不然不会有返回码上报
  reportAssetSpeed: true,
  api: {
    retCodeHandler(data, url, xhr) {
      // 注意这里的data的数据类型，跟接口返回值的数据类型一致，开发者需要根据实际情况自行处理
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
    resourceTypeHandler(url) {
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
  reportApiSpeed: {
    urlHandler(url, payload) {
      if ((/www\.example\.com\/user\/\d*/).test(url)) {
        return 'www.example.com/user/:id';
      }
      return url;
    }
  }
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
})
```
