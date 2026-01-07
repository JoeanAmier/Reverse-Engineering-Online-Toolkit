# REOT API 文档

本文档描述 REOT 提供的 JavaScript API 接口。

## 全局对象

所有 REOT 功能都挂载在全局 `REOT` 对象下。

## REOT.utils - 工具函数

### copyToClipboard(text)

复制文本到剪贴板。

```javascript
const success = await REOT.utils.copyToClipboard('Hello World');
if (success) {
    console.log('复制成功');
}
```

### downloadFile(content, filename, mimeType)

下载文件。

```javascript
REOT.utils.downloadFile('文件内容', 'output.txt', 'text/plain');
```

### readFile(file, readAs)

读取文件内容。

```javascript
const content = await REOT.utils.readFile(file, 'text');
// readAs: 'text' | 'arrayBuffer' | 'dataURL'
```

### debounce(func, wait)

防抖函数。

```javascript
const debouncedFn = REOT.utils.debounce(() => {
    console.log('执行');
}, 300);
```

### throttle(func, limit)

节流函数。

```javascript
const throttledFn = REOT.utils.throttle(() => {
    console.log('执行');
}, 300);
```

### formatBytes(bytes, decimals)

格式化字节大小。

```javascript
REOT.utils.formatBytes(1024); // "1 KB"
REOT.utils.formatBytes(1234567, 2); // "1.18 MB"
```

### generateId(prefix)

生成唯一 ID。

```javascript
REOT.utils.generateId('tool'); // "tool_1234567890_abc123"
```

### storage

本地存储封装。

```javascript
REOT.utils.storage.set('key', { data: 'value' });
REOT.utils.storage.get('key'); // { data: 'value' }
REOT.utils.storage.remove('key');
REOT.utils.storage.clear();
```

### showNotification(message, type, duration)

显示通知消息。

```javascript
REOT.utils.showNotification('操作成功', 'success');
REOT.utils.showNotification('操作失败', 'error');
// type: 'success' | 'error' | 'warning' | 'info'
```

## REOT.i18n - 国际化

### t(key, params)

获取翻译文本。

```javascript
REOT.i18n.t('common.copy'); // "复制"
REOT.i18n.t('message.hello', { name: 'World' }); // 支持参数替换
```

### setLocale(locale)

切换语言。

```javascript
await REOT.i18n.setLocale('en-US');
```

### getLocale()

获取当前语言。

```javascript
REOT.i18n.getLocale(); // "zh-CN"
```

## REOT.router - 路由

### navigate(path, replace)

导航到指定路径。

```javascript
REOT.router.navigate('/tools/encoding/base64/');
REOT.router.navigate('/tools/hashing/md5/', true); // replace 当前历史记录
```

### onChange(callback)

监听路由变化。

```javascript
REOT.router.onChange((path, previousPath) => {
    console.log(`从 ${previousPath} 导航到 ${path}`);
});
```

### getRoute()

获取当前路由。

```javascript
REOT.router.getRoute(); // "/tools/encoding/base64/"
```

## REOT.tools - 工具注册

### register(tool)

注册一个工具。

```javascript
REOT.tools.register({
    id: 'my-tool',
    category: 'encoding',
    name: 'tools.my-tool.title',
    description: 'tools.my-tool.description',
    icon: '🔧',
    path: '/tools/encoding/my-tool/',
    keywords: ['my', 'tool'],
    popular: false
});
```

### getAll()

获取所有工具。

```javascript
const tools = REOT.tools.getAll();
```

### getById(id)

根据 ID 获取工具。

```javascript
const tool = REOT.tools.getById('base64');
```

### search(query)

搜索工具。

```javascript
const results = REOT.tools.search('编码');
```

## 工具模块导出

每个工具模块会导出到全局对象，可用于测试。

```javascript
// Base64 工具
window.Base64Tool.encode('Hello');
window.Base64Tool.decode('SGVsbG8=');

// MD5 工具
window.MD5Tool.hash('Hello');

// JSON 工具
window.JsonTool.format('{"a":1}');
window.JsonTool.minify('{ "a": 1 }');

// UUID 工具
window.UUIDTool.generateUUIDv4();
```
