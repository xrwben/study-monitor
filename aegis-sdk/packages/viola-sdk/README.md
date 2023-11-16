# Viola SDK

## 安装
### NPM
在项目支持 NPM 时推荐使用 NPM 安装 Aegis SDK。
```bash
$ npm install --save aegis-viola-sdk
```

## 使用

### 初始化
使用非常简单，只需要新建一个 Aegis 实例，传入相应的配置即可：
```javascript
import Aegis from 'aegis-viola-sdk';

const aegis = new Aegis({
    id: 'pGUVFTCZyewxxxxx',
    uin: viola.pageData.uin,
    delay: 150,
})
```
::: warning 注意 ⚠️
为了不遗漏数据，须尽早进行初始化；
:::
::: tip 当您做了以上接入工作之后，您已经开始享受 Aegis 提供的以下功能：
1、错误监控：js执行错误；
2、数据统计和分析：可在 [开发者平台](https://tam.woa.com) 上查看各个纬度的数据分析；
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

Aegis SDK 为每个用户设备分配的唯一标示，会存储在 viola 的 cache，用来区分用户，计算 uv 等。


## 实例方法
Aegis 实例暴露接口简单实用，目前 Aegis 实例有以下方法供您使用：  
`setConfig` 、 `info` 、 `infoAll` 、 `report` 、 `error` 、 `reportEvent` 、 `reportTime` 、 `time` 、 `timeEnd`、 `destroy`

### setConfig
该方法用来修改实例配置，比如下面场景：  
在实例化 Aegis 时需要传入配置对象
```javascript
const aegis = new Aegis({
    id: 'pGUVFTCZyewxxxxx',
    uin: 777
})
```
很多情况下，并不能一开始就获取到用户的 `uin`，而等获取到用户的 `uin` 才开始实例化 Aegis 就晚了，这期间发生的错误 Aegis 将监听不到。`uin` 的设置可以在获取到用户的时候：
```javascript
const aegis = new Aegis({
    id: 'pGUVFTCZyewxxxxx'
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

aegis.report(new Error('上报一个错误'));

aegis.error(new Error('主动上报一个JS执行错误'));
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

### destroy

该方法用于销毁 sdk 实例，销毁后，不再进行数据上报

```javascript
aegis.destroy();
```

## 错误监控
::: warning
Aegis 的实例会自动进行以下监控，注意！是 Aegis 实例会进行监控，当您只是引入了 SDK 而没有将其实例化时，Aegis 将什么都不会做。
:::

### JS执行错误
Aegis 通过监听 `viola.on('error')` 事件来获取项目中的报错，并且通过解析错误和分析堆栈，将错误信息自动上报到后台服务中。该上报的上报等级为 error ，所以，当自动上报的错误达到阈值时，Aegis 将会自动告警，帮助您尽早发现异常。由于上报等级为 error ，自动上报也将影响项目的每日评分。

## 相比 Web SDK，viola 场景下目前尚未支持的能力
- 页面测速、cgi 测速、静态资源测速
- 离线日志



## 配置文档
| 配置 | 描述 |
| -------- | -------- |
| id | 必须，number，默认 无。<br>开发者平台分配的项目ID |
| uin | 建议，string，默认 无。<br>业务定义的当前用户的唯一标识符，用来查找固定用户的日志。白名单上报时将根据该字段判定用户是否在白名单中，字段仅支持`字母数字@=._-`，正则表达式: `/^[@=.0-9a-zA-Z_-]{1,60}$/` |
| version | 可选，string，默认 sdk 版本号。<br>当前上报版本，当页面使用了pwa或者存在离线包时，可用来判断当前的上报是来自哪一个版本的代码，仅支持`字母数字.,:_-`，长度在 60 位以内 `/^[0-9a-zA-Z.,:_-]{1,60}$/` |
| delay | 可选，number，单位 ms，默认 1000ms。<br>上报节流时间，在该时间段内的上报将会合并到一个上报请求中。如果想同步进行上报，info 、 infoAll 、 report 支持第二个可选参数 immediately，当 immediately 为 true 时将会立即上报。 |
| repeat | 可选，number，默认 5。<br>重复上报次数，对于同一个错误或者同一个接口测速超过多少次不上报。如果传入 repeat 参数为 0，则不限制。 |
| env | 可选，enum，默认 Aegis.environment.production。 <br> 当前项目运行所处的环境。｜
| api | 可选，object，默认为 {}。相关的配置:  <br> apiDetail : 可选，boolean，默认false。上报 api 信息的时候，是否上报 api 的请求参数和返回值; <br><br> retCodeHandler: Function(data: String, url: String, xhr: Object):{isErr: boolean, code: string}， 返回码上报钩子函数。 会传入接口返回数据,请求url和xhr对象; <br><br> reqParamHandler: Function(data: any, url: String) 上报请求参数的处理函数，可以对接口的请求参数进行处理，方便用户过滤上报请求参数的信息; <br><br> resBodyHandler: Function(data: any, url: String) 上报 response 返回 body 的处理函数，可以对接口返回值的 response body 进行处理，只上报关键信息; <br><br> ret: 可选，string[]或string, 默认为['ret', 'retcode', 'code']。接口返回码字段key， 会尝试获取http请求的返回字段中的这几个字段，如果存在，且存在于errCode中，或者不在code中，会认为此次请求失败并上报; <br><br> errCode: 可选，string[ ]或string,默认为[]。如果配置errCode且ret值（value）存在于errCode中或等于errCode，则会认为此次请求失败并上报; <br><br> code: 可选，string[]或string, 默认为['0']。如果配置code且ret值（value）不存在于code中或不等于code，则会认为此次请求失败并上报,优先级低于errCode。支持数组和数字。|
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
| extRequestOpts | 可选，object，自定义发送上报请求时候的额外参数，该参数会在调用`viola http`模块发送请求时传给客户端，比如 `extRequestOpts: {forReport: true,timeout: ViolaEnv.platform.toLowerCase() === 'ios' ? 3 : 3000,}`,会携带`forReport`和`timeout`参数给客户端处理 |
