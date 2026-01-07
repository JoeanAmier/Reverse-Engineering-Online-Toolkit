# REOT 开发文档

本文档介绍如何为 REOT 开发新功能。

## 开发环境

### 前置要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- Git
- 代码编辑器（推荐 VS Code）

### 启动开发服务器

```bash
# 使用 Python
python -m http.server 8080

# 使用 Node.js
npx serve

# 使用 PHP
php -S localhost:8080
```

然后访问 `http://localhost:8080`

## 项目结构

```
REOT/
├── assets/
│   ├── css/           # 样式文件
│   ├── js/            # 核心 JavaScript
│   ├── images/        # 图片资源
│   └── fonts/         # 字体文件
├── components/        # 公共组件
├── libs/              # 第三方库
├── locales/           # 国际化文件
├── tools/             # 工具模块
│   ├── encoding/      # 编码工具
│   ├── hashing/       # 哈希工具
│   ├── encryption/    # 加密工具
│   └── ...
├── docs/              # 文档
└── tests/             # 测试
```

## 添加新工具

### 1. 创建工具目录

```bash
mkdir -p tools/<category>/<tool-name>
```

### 2. 创建工具文件

每个工具需要以下文件：

- `index.html` - 工具页面
- `<tool-name>.js` - 核心逻辑
- `<tool-name>.css` - 样式（可选）

### 3. 工具 HTML 模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="tools.<tool-id>.title">工具标题 - REOT</title>
    <link rel="stylesheet" href="../../../assets/css/main.css">
    <link rel="stylesheet" href="../../../assets/css/themes/light.css" id="theme-light">
    <link rel="stylesheet" href="../../../assets/css/themes/dark.css" id="theme-dark" disabled>
</head>
<body>
    <div class="tool-container">
        <header class="tool-header">
            <h1 data-i18n="tools.<tool-id>.title">工具标题</h1>
            <p data-i18n="tools.<tool-id>.description">工具描述</p>
        </header>

        <main class="tool-main">
            <!-- 输入区域 -->
            <section class="input-section">
                <label data-i18n="common.input">输入</label>
                <textarea id="input" class="form-input form-textarea"></textarea>
            </section>

            <!-- 操作按钮 -->
            <section class="action-section">
                <button id="action-btn" class="btn btn--primary">执行</button>
                <button id="clear-btn" class="btn btn--outline" data-i18n="common.clear">清除</button>
                <button id="copy-btn" class="btn btn--outline" data-i18n="common.copy">复制</button>
            </section>

            <!-- 输出区域 -->
            <section class="output-section">
                <label data-i18n="common.output">输出</label>
                <textarea id="output" class="form-input form-textarea" readonly></textarea>
            </section>
        </main>
    </div>

    <script src="../../../assets/js/utils.js"></script>
    <script src="../../../assets/js/i18n.js"></script>
    <script src="<tool-name>.js"></script>
</body>
</html>
```

### 4. 工具 JavaScript 模板

```javascript
/**
 * 工具名称
 * @description 工具描述
 * @author Your Name
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const actionBtnEl = document.getElementById('action-btn');
    const clearBtnEl = document.getElementById('clear-btn');
    const copyBtnEl = document.getElementById('copy-btn');

    /**
     * 核心处理函数
     * @param {string} input - 输入
     * @returns {string} - 输出
     */
    function process(input) {
        // 实现处理逻辑
        return result;
    }

    // 事件绑定
    actionBtnEl?.addEventListener('click', () => {
        try {
            outputEl.value = process(inputEl.value);
        } catch (error) {
            outputEl.value = error.message;
            REOT.utils?.showNotification(error.message, 'error');
        }
    });

    clearBtnEl?.addEventListener('click', () => {
        inputEl.value = '';
        outputEl.value = '';
    });

    copyBtnEl?.addEventListener('click', async () => {
        const success = await REOT.utils?.copyToClipboard(outputEl.value);
        if (success) {
            REOT.utils?.showNotification('已复制', 'success');
        }
    });

    // 导出（用于测试）
    window.MyTool = { process };
})();
```

### 5. 添加国际化

在 `locales/zh-CN.json` 和 `locales/en-US.json` 中添加：

```json
{
    "tools": {
        "<tool-id>": {
            "title": "工具标题",
            "description": "工具描述"
        }
    }
}
```

### 6. 注册工具

在 `assets/js/tools-registry.js` 中添加：

```javascript
REOT.tools.register({
    id: '<tool-id>',
    category: '<category>',
    name: 'tools.<tool-id>.title',
    description: 'tools.<tool-id>.description',
    icon: '🔧',
    path: '/tools/<category>/<tool-id>/',
    keywords: ['关键词'],
    popular: false
});
```

## 代码规范

### JavaScript

- 使用 IIFE 模式包装代码
- 使用 `'use strict'`
- 使用 JSDoc 注释
- 遵循 ESLint 标准配置

### CSS

- 使用 BEM 命名规范
- 使用 CSS 变量
- 优先使用 Flexbox/Grid

### HTML

- 使用语义化标签
- 添加 `data-i18n` 属性支持国际化
- 遵循无障碍访问标准

## 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

## 提交规范

使用 Conventional Commits：

```
feat(encoding): 添加 Base64 工具
fix(hashing): 修复 MD5 中文编码问题
docs: 更新开发文档
style: 格式化代码
refactor: 重构路由模块
test: 添加 Base64 单元测试
chore: 更新依赖
```
