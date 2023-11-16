# aegis-liteapp-sdk

Aegis 是腾讯云监控团队提供的前端监控 SDK，涵盖了错误监控，资源测速（img, script, css），接口测速，页面性能（首屏时间）。无需侵入代码，只需引入 SDK 即可自动完成所有监控上报。

在使用 aegis 时无需在业务代码中打点或者做任何其他操作，可以做到与业务代码充分解耦。aegis 将会自动监控前端错误，在错误发生时上报错误的具体情况，帮助您快速定位问题。当您开启资源测速时，aegis 将会自动监听页面资源加载情况（耗费时长、成功率等），并在不影响前端性能的前提下收集前端的性能数据，帮助您快速定位性能短板，提升用户体验。

aegis-liteapp-sdk 是针对liteapp开发的数据收集和上报 SDK。

## 安装

### NPM

在项目支持 NPM 时推荐使用 NPM 安装 Aegis SDK。

```bash
$ npm install aegis-liteapp-sdk
```

## 使用



### Aegis配置文档

| 配置 | 描述 |
| -------- | -------- |
| id | 必须，string，默认 无。<br>开发者平台分配的项目上报ID |
| uin | 建议，string，默认取 cookie 中的 uin 字段。<br>当前用户的唯一标识符，白名单上报时将根据该字段判定用户是否在白名单中，字段仅支持`字母数字@=._-`，正则表达式: `/^[@=.0-9a-zA-Z_-]{1,60}$/` |
| userStore | 可选，boolean，默认 false。<br>显示声明你的应用是否使用了Store |
| reportApiSpeed | 可选，boolean，默认 false。<br>是否开启接口测速 |
| version | 可选，string，默认当前lite应用的版本号 |
| delay | 可选，number，默认 1000 ms。<br>上报节流时间，在该时间段内的上报将会合并到一个上报请求中。 |
| repeat | 可选，number，默认 5。<br>重复上报次数，对于同一个错误或者同一个接口测速超过多少次不上报。如果传入 repeat 参数为 0，则不限制。 |
| api | 可选，object，默认为{}。相关的配置: <br> apiDetail : 可选，boolean，默认false。api 失败的时候，是否上报 api 的请求参数和返回值;<br> ret: 可选，string[]或string, 默认为['ret', 'retcode', 'code']。接口返回码key。<span id="jump">[见示例[1]](#exp1)</span><br><br> errCode: 可选，string[ ]或string,默认为[]。接口返回码value。如果http返回码存在于errCode中，则会认为此次请求失败并上报。[见示例[2]](#exp2)<br><br> code: 可选，string[]或string, 默认为['0']。接口返回码value。如果http返回码不存在于code中，则会认为此次请求失败并上报.[见示例[3]](#exp3)<br><br>如果配置了errCode或code，则不会使用默认值。
| url | 可选，string，默认 '//aegis.qq.com/collect'。<br>日志上报地址 |
| speedUrl | 可选，string，默认 '//aegis.qq.com/speed'。<br>测速日志上报地址 |
| whiteListUrl | 可选，string，默认 '//aegis.qq.com/collect/whitelist'。<br>白名单确认接口 <br>如果想要关闭白名单接口请求，可以传空字符串|
| ext1 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |
| ext2 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |
| ext3 | 可选，string，自定义上报的额外维度，上报的时候可以被覆盖 |

### UseStore配置

对Store，我们提供了辅助方法UseStore

| 参数 | 描述 |
| -------- | -------- |
| store | store配置 |
| aegisFactory | 必须，类型为返回一个aegis实例的Function |


### 初始化
#### 使用了Store的应用【推荐】

我们将实例化两类Aegis实例

1、在app.json中添加vendors引入 

2、在vendor中，实例化Aegis-PageView

3、在Store.js中，实例化Aegis-Store


```javascript
// common.js
import Aegis from 'aegis-liteapp-sdk';

export const genAegis = ()=> {
  return new Aegis({
    id: "pGUVFTCZyewxxxxx", // 项目上报ID
    uin: 'xxx', // 用户唯一 ID（可选）
    reportApiSpeed: true, // 是否启用接口测速(可选)
    useStore: true, // 声明liteapp项目是否使用了Store
  })
}
```

```javascript

// page层，vendor中
import { genAegis } from './common'
genAegis();

```

```javascript

// Store层，store/index.js中
import { UseStore } from 'aegis-liteapp-sdk'
import { genAegis } from './common'

import store from './store' // 你的store逻辑

setStore(UseStore({
    store,
    // 实例化用例
    aegisFactory() {
        return genAegis();
    },
}))
```

#### 不使用Store的应用  

```javascript
new Aegis({
    id: "pGUVFTCZyewxxxxx", // 项目上报ID
    uin: 'xxx', // 用户唯一 ID（可选）
    reportApiSpeed: true, // 是否启用接口测速(可选)
    useStore: false, // 声明liteapp项目是否使用了Store
})
```



::: warning 注意 ⚠️

由于 `liteapp` 中运行机制机制：页面层互相独立互不共享状态，只能通过类vuex的Store层管理状态。
若你的liteapp应用使用了Store，则aegis的工作流程将如下图所示；   
若不使用Store，将每个页面创建一个完整的实例，每个页面都上报pv。

> 无论从业务逻辑的维护还是监控层面，我们都建议多页面的liteapp应用使用上Store层。


![](https://wework.qpic.cn/wwpic/327303_lZQSpD15SIyXECZ_1646625763/0)


:::

::: tip   
当您做了以上接入工作之后，您已经开始享受 Aegis 提供的以下功能：
1、错误监控：retcode异常；  
2、测速：接口测速；  
3、数据统计和分析：可在 [RUM 平台](https://console.cloud.tencent.com/rum) 上查看各个纬度的数据分析；
::: 

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
  new Error('我是一条错误信息，推荐在try..catch或者Promise.reject中使用，另外，我还会参与Aegis评分哟')
)
```


## aid

Aegis SDK 为每个用户设备分配的唯一标示，会存储在浏览器的 localStorage 里面，用来区分用户，计算 uv 等。aid 只有用户清理浏览器缓存才会更新。


## 实例方法

Aegis 实例暴露接口简单实用，目前 Aegis 实例有以下方法供您使用：  
`setConfig` 、 `info` 、 `infoAll` 、 `report` 、 `error` 、 `reportEvent` 、 `reportTime` 、 `time` 、 `timeEnd`

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
Aegis 的实例会自动进行以下监控，注意！是 Aegis 实例会进行监控，当您只是引入了 SDK 而没有将其实例化时，Aegis 将什么都不会做。
:::

### retcode异常

同上，Aegis 改写 `fetch` 对象（Aegis真的很专业）之后，将获得API返回的内容，并尝试在内容中获取到本次请求的 `retcode`，
当 `retcode` 不符合预期的时候，会认为本次请求出现了异常，并进行上报。
> 如何获取 `retcode` 以及哪些`retcode` 是正常的可以在配置文档中查看。

## 性能监控

### 接口测速

> 打开方式：初始化时传入配置 `reportApiSpeed: true`  

Aegis 通过劫持 `fetch` 进行接口测速。

## 附录

- [Liteapp中Store的设计](https://iwiki.woa.com/pages/viewpage.action?pageId=538566290)