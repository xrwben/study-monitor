# 前端监控（TAM）

***Tencent Application Monitor***

致力于统一公司前端监控，简化开发者接入监控成本。目前公司内部监控平台多且功能分散，但是开发者的主要诉求比较集中，错误，日志，测速，性能，全链路。此提案目的在于能够将各个监控功能集中到统一的项目中来，提高开发效率。

## 项目介绍

前端监控 Oteam

作为一名前端开发者，想必你一定遇到过这些问题。

1. 业务报错无处查，用户环境复杂多变，线上问题复现困难。
2. 公司内部监控系统众多，往往一个项目内集成了很多上报代码，有时候数据上报代码甚至多余业务代码。
3. 计算首屏没有统一的标准，项目中打了很多点来上报首屏。
4. cgi 或者静态资源报错导致页面不可用或出错，开发者无感知。
5. 用户反馈问题，前端查到接口超时或者报错，后端查日志发现没有找到请求。

等等

前端监控 Oteam 致力于解决开发者所关系的技术监控维度，涵盖了日志上报，错误监控，性能监控，资源测速等功能。前端监控属于前端基础设施建设，阿里云有 ARMS，UC 出品了岳鹰，目前公司只有团队级别的监控项目，不仅难以统一，而且开发力量分散。前端监控 Oteam 希望可以统一公司的前端监控体系，对内提供中台化的服务，开发者可以快速接入，并且无需提供运维人力。

## 快速上手

前端监控 Oteam 产品是 https://tam.woa.com
前端监控 Oteam 公有云产品 https://console.cloud.tencent.com/rum

主要功能有以下:

1. 数据大盘，方便用户对项目整体质量把关。
2. 日志搜索，其中日志类型丰富，包括用户的流水日志，js错误日志，http请求错，promise错误，图片加载失败，js加载失败等等。
3. 页面访问走势图，是用户项目 pv/uv 进行统计分析，维度包括页面url、地域、网络、运营商等。
4. 页面测速，通过对用户页面 performance 的分析，详细计算用户首屏耗时。
5. 接口测速，其中包括接口耗时，返回码分布，接口耗时分布，维度包括网络，地域等。
6. 静态资源测速。
7. 用户项目信息管理，白名单管理等。

### SDK 开发指南

sdk 架构说明

![](https://nowpic.gtimg.com/feeds_pic/PiajxSqBRaEKflxoPlJBnLKsjagdJEZaSenMWWfcxLpn2Eadh0DUAWQ/)

core: 核心逻辑，其中包括限流，所有的上报接口统计，抽样，参数处理，白名单等的
xx-sdk: sdk 独有的逻辑，其中包括上报的具体实现，各个平台独有的上报，比如 web 里面的页面性能，静态资源测速等

所有的功能点都是通过 plugin 实现，因此如果开发者需要添加新的功能，建议也将其封装为插件比较好。

### 开发

运行命令

```sh
npm start
```

如果要开发具体某个模块，可以运行命令

```sh
npm run dev --package=web-sdk
```

SDK 开发需要将本地代码代理到用户项目或者页面中，下面以 web 项目为例，讲解两种开发模式的代理调试方式

1. 如果用户页面使用 cdn 模式

本项目启动后，可以使用 whistle 把 cdn 地址代理到本地，代理地址

```sh
tam.cdn-go.cn/aegis-sdk/latest/aegis.min.js [project_path]/aegis-sdk/packages/web-sdk/lib/aegis.js
```

注意要修改 [project_path] 为开发代码所在地址

2. 如果用户项目使用 npm 包

项目启动后，cd 到 packages/web-sdk，在控制台执行

```sh
npm link
```

在需要调试的项目中执行

```sh
npm link @tencent/aegis-web-sdk
```

### 发布

 ```sh
 // 预发布
 git tag -a vxxx -m "pre" // 此处pre表明发布到预发布,即/1/
 // 正式发布
 git tag -a vxxx -m "prod" // 此处prod表明发布到正式，即latest
 ```

### 技术架构

我们对公司内现有技术进行整合，来减少开发和运维成本。主要合作对象为 [腾讯云 CLS](https://console.cloud.tencent.com/cls) 和 腾讯云监控产品中心。

![TAM技术架构.png](https://nowpic.gtimg.com/feeds_pic/ajNVdqHZLLCX7Xaj0dzOCib6W06WAibQOsSvOWaiaPQGjzXicR7Nvb2QDA/)

### 仓库信息简介

｜Project| Description|
| :-- | :-- |
| [Product-Prototype](https://git.woa.com/TAM/Product-Prototype) | 产品原型，产品讨论，产品迭代 |
| [aegis-sdk](https://git.woa.com/aegis/aegis-sdk) | 数据上报 SDK，插件化，数据流，pipeline |
| [tam-acceptor-go](https://git.woa.com/TAM/tam-acceptor-go)| 数据上报接入层，日志收集，数据存储到CLS |
| [tam-speed-go](https://git.woa.com/TAM/tam-speed-go) | 测速数据上报接入层，限流，抽样，维度数据入库 |
| [tea-app-tam](https://git.woa.com/TAM/tea-app-tam) | 基于 tea 实现的前端监控开发者平台 |

### Oteam 简介

[前端监控（TAM）](https://techmap.oa.com/oteam/8588)

### 代码规范

[代码规范和 commit 规范](https://git.woa.com/TAM/Product-Prototype/blob/master/tam-standard/Code%20Standard.md)

## 常见问题（FAQ）

- 如何知道项目进展以及需求管理？

前端监控 Oteam 的需求管理放在各个项目的 issue 中，全部需求管理放在 [Product-Prototype](https://git.woa.com/TAM/Product-Prototype/issues) 里面。

- 发现项目有问题如何反馈？

可以去产品原型仓库的issue中进行反馈 [issue](https://git.woa.com/TAM/Product-Prototype/issues/new?assignee_id=&milestone_id=)。

- TAM 与 Aegis 是什么关系？

TAM 是前端监控 Oteam 的名字，也是我们产品的名字，Aegis 是我们产品的一部分，早期我们是基于 Aegis 进行开发和扩展的，所以对用户来说可能就是名字不同，换个地方使用而已。

- 我之前用的是 Aegis，切换到 tam 有什么成本吗？

没有任何成本，对用户侧是透明的，sdk 全兼容。

## 行为准则（Code Of Conduct）

本仓库内全部项目都尽可能基于开源的思想来做，我们也非常欢迎您的贡献，无论是修复错别字、提 Bug 还是提交一个新的特性。

**代码提交请遵守我们的代码规范**: [查看代码规范](https://git.woa.com/TAM/Product-Prototype/blob/master/tam-standard/Code%20Standard.md)

如果您使用过程中发现 Bug，或者有任何好的建议，都可以通过 [issues](https://git.woa.com/TAM/Product-Prototype/issues/new?assignee_id=&milestone_id=) 来提交。

如果您在使用 TAM 方案 的过程中，有一些心得体会希望分享给大家，也欢迎贡献教程。

## 如何加入（How To Join）

加入 Oteam 可以参考 [Oteam 准入准出机制](https://git.woa.com/TAM/Product-Prototype/issues/26)。

### 参与 Oteam 方式

确立参与方向，表明明确意愿。
PMC 拉小群讨论。
贡献代码或者产品后进 Oteam 群。
月度持续贡献，贡献得到 PMC 认可可以获取 Oteam 开发贡献激励。
团队方式参与，或者主导一个方向，并且持续产出（代码，或者产品原型）可申请 PMC。

### 准出机制

进入 Oteam 后三个月没有任何贡献(代码，或者产品原型)，即视为自动离开 Oteam。
离开 Oteam 后重新加入 Oteam 规则同上。

## 团队介绍（Members）

前端监控 Oteam（TAM）致力于统一公司前端监控，简化开发者接入监控成本。技术上推进公司监控中台化，标准化，目标成为公司级别监控方案。未来上云并对外提供服务。整合现有监控，包括原aegis，腾讯云cls，腾讯云业务监控，减少重复建设。

目前已经支持 Web、小程序、RN、Hippy、Viola、Node、iOS，如有更多端需求，欢迎参与共建。
