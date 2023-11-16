# aegis-core 开发文档

> 上报核心，与平台无关

## 生命周期

### onInited

当所有的插件安装完 Aegis 初始化完成时执行

### beforeReport

在上报**普通日志**前执行

### beforeReportSpeed

在上报**测速日志**前执行

## 插件
#### 插件编写

```js
import Core, { Plugin } from 'aegis-core';
export default new Plugin({
  name: '', // 插件名称，需要唯一
  init() {
    // 插件初始化执行一次，此处只有启用该插件才会执行
  },
  onNewAegis(aegis: Core) {
    // 每次new一个实例时执行，此处只有启用该插件才会执行
  },
});

```
#### 插件提供额外方法

提供遍历所有实例方法

```
this.$walk((aegis: core) => {
    // your code
})
```