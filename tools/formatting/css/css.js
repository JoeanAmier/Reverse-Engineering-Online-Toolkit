/**
 * CSS 格式化工具
 * @description CSS 代码格式化、美化与压缩
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * 检查当前是否在 CSS 工具页面
     */
    function isCssToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/formatting/css');
    }

    /**
     * CSS 词法分析器
     */
    function tokenize(css) {
        const tokens = [];
        let i = 0;

        while (i < css.length) {
            const char = css[i];

            // 跳过空白
            if (/\s/.test(char)) {
                i++;
                continue;
            }

            // 多行注释
            if (css.substr(i, 2) === '/*') {
                const end = css.indexOf('*/', i + 2);
                const comment = css.substring(i, end === -1 ? css.length : end + 2);
                tokens.push({ type: 'comment', value: comment });
                i += comment.length;
                continue;
            }

            // 字符串（单引号或双引号）
            if (char === '"' || char === "'") {
                let str = char;
                i++;
                while (i < css.length) {
                    if (css[i] === '\\' && i + 1 < css.length) {
                        str += css[i] + css[i + 1];
                        i += 2;
                    } else if (css[i] === char) {
                        str += css[i];
                        i++;
                        break;
                    } else {
                        str += css[i];
                        i++;
                    }
                }
                tokens.push({ type: 'string', value: str });
                continue;
            }

            // @规则
            if (char === '@') {
                let atRule = '@';
                i++;
                while (i < css.length && /[a-zA-Z-]/.test(css[i])) {
                    atRule += css[i];
                    i++;
                }
                tokens.push({ type: 'at-rule', value: atRule });
                continue;
            }

            // 选择器或属性名
            if (/[a-zA-Z_\-#.*:\[\]()>+~=^$|]/.test(char)) {
                let ident = '';
                while (i < css.length && /[a-zA-Z0-9_\-#.*:\[\]()>+~=^$|"'\s,]/.test(css[i])) {
                    if (css[i] === '{' || css[i] === ';' || css[i] === '}') break;
                    // 处理括号内的内容（如 url(), calc() 等）
                    if (css[i] === '(') {
                        ident += css[i];
                        i++;
                        let parenDepth = 1;
                        while (i < css.length && parenDepth > 0) {
                            if (css[i] === '(') parenDepth++;
                            else if (css[i] === ')') parenDepth--;
                            ident += css[i];
                            i++;
                        }
                        continue;
                    }
                    ident += css[i];
                    i++;
                }
                ident = ident.trim();
                if (ident) {
                    tokens.push({ type: 'ident', value: ident });
                }
                continue;
            }

            // 符号
            if (char === '{') {
                tokens.push({ type: 'lbrace', value: '{' });
                i++;
                continue;
            }

            if (char === '}') {
                tokens.push({ type: 'rbrace', value: '}' });
                i++;
                continue;
            }

            if (char === ':') {
                tokens.push({ type: 'colon', value: ':' });
                i++;
                continue;
            }

            if (char === ';') {
                tokens.push({ type: 'semicolon', value: ';' });
                i++;
                continue;
            }

            // 其他字符
            tokens.push({ type: 'other', value: char });
            i++;
        }

        return tokens;
    }

    /**
     * 格式化 CSS
     */
    function formatCss(css, options = {}) {
        const {
            indent = '    ',
            braceStyle = 'expand',
            sortProperties = false
        } = options;

        const tokens = tokenize(css);
        let result = '';
        let currentIndent = 0;
        let inBlock = false;
        let properties = [];
        let currentProperty = '';
        let currentValue = '';
        let expectValue = false;

        function addIndent() {
            return indent.repeat(currentIndent);
        }

        function flushProperties() {
            if (properties.length === 0) return;

            if (sortProperties) {
                properties.sort((a, b) => a.name.localeCompare(b.name));
            }

            for (const prop of properties) {
                result += addIndent() + prop.name + ': ' + prop.value + ';\n';
            }
            properties = [];
        }

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const nextToken = tokens[i + 1];

            switch (token.type) {
                case 'comment':
                    if (inBlock) {
                        result += addIndent() + token.value + '\n';
                    } else {
                        result += token.value + '\n';
                    }
                    break;

                case 'at-rule':
                    result += token.value;
                    // 检查是否是 @media, @keyframes 等块级规则
                    if (['@media', '@keyframes', '@supports', '@font-face', '@page'].includes(token.value)) {
                        // 读取条件
                        while (tokens[i + 1] && tokens[i + 1].type !== 'lbrace') {
                            i++;
                            result += ' ' + tokens[i].value.trim();
                        }
                    }
                    break;

                case 'ident':
                    if (!inBlock) {
                        // 选择器
                        if (braceStyle === 'expand') {
                            result += token.value + ' ';
                        } else {
                            result += token.value + ' ';
                        }
                    } else if (!expectValue) {
                        // 属性名
                        currentProperty = token.value;
                    } else {
                        // 属性值
                        currentValue = token.value;
                    }
                    break;

                case 'lbrace':
                    inBlock = true;
                    if (braceStyle === 'expand') {
                        result = result.trimEnd() + ' {\n';
                    } else {
                        result = result.trimEnd() + ' {\n';
                    }
                    currentIndent++;
                    break;

                case 'rbrace':
                    flushProperties();
                    currentIndent = Math.max(0, currentIndent - 1);
                    result += addIndent() + '}\n\n';
                    inBlock = false;
                    expectValue = false;
                    currentProperty = '';
                    currentValue = '';
                    break;

                case 'colon':
                    if (inBlock) {
                        expectValue = true;
                    } else {
                        // 伪类选择器
                        result += ':';
                    }
                    break;

                case 'semicolon':
                    if (currentProperty && currentValue) {
                        properties.push({ name: currentProperty, value: currentValue.trim() });
                    }
                    currentProperty = '';
                    currentValue = '';
                    expectValue = false;
                    break;

                case 'string':
                    if (expectValue) {
                        currentValue += token.value;
                    } else {
                        result += token.value;
                    }
                    break;
            }
        }

        return result.trim();
    }

    /**
     * 压缩 CSS
     */
    function minifyCss(css) {
        // 移除注释
        let result = css.replace(/\/\*[\s\S]*?\*\//g, '');

        // 移除多余空白
        result = result.replace(/\s+/g, ' ');

        // 移除选择器周围的空白
        result = result.replace(/\s*{\s*/g, '{');
        result = result.replace(/\s*}\s*/g, '}');
        result = result.replace(/\s*:\s*/g, ':');
        result = result.replace(/\s*;\s*/g, ';');
        result = result.replace(/\s*,\s*/g, ',');

        // 移除最后一个分号
        result = result.replace(/;}/g, '}');

        // 移除开头和结尾的空白
        result = result.trim();

        // 压缩颜色值
        result = result.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/gi, '#$1$2$3');

        // 移除 0 的单位
        result = result.replace(/(\s|:)0(px|em|rem|%|pt|pc|in|cm|mm|ex|ch|vw|vh|vmin|vmax)/gi, '$10');

        // 压缩 0.x 为 .x
        result = result.replace(/(\s|:)0\.(\d+)/g, '$1.$2');

        return result;
    }

    /**
     * 获取选项
     */
    function getOptions() {
        const indentValue = document.getElementById('indent-select')?.value || '4';
        const indent = indentValue === 'tab' ? '\t' : ' '.repeat(parseInt(indentValue));
        const braceStyle = document.getElementById('brace-style')?.value || 'expand';
        const sortProperties = document.getElementById('sort-properties')?.checked ?? false;

        return { indent, braceStyle, sortProperties };
    }

    /**
     * 加载示例
     */
    function loadExample() {
        return `/* 全局样式 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333333;
    background-color: #ffffff;
}

/* 头部样式 */
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

.header .logo {
    font-size: 24px;
    font-weight: bold;
    color: #fff;
    text-decoration: none;
}

/* 导航菜单 */
.nav-menu {
    display: flex;
    gap: 20px;
    list-style: none;
}

.nav-menu a {
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    transition: color 0.3s ease;
}

.nav-menu a:hover {
    color: #ffffff;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .header {
        height: auto;
        padding: 10px;
    }

    .nav-menu {
        flex-direction: column;
        gap: 10px;
    }
}

/* 动画 */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}`;
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isCssToolActive()) return;

        const target = e.target;
        const inputEl = document.getElementById('input');
        const outputEl = document.getElementById('output');

        // 格式化按钮
        if (target.id === 'format-btn' || target.closest('#format-btn')) {
            try {
                const options = getOptions();
                const result = formatCss(inputEl?.value || '', options);
                if (outputEl) outputEl.value = result;
                REOT.utils?.showNotification('格式化成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('格式化失败: ' + error.message, 'error');
            }
        }

        // 压缩按钮
        if (target.id === 'minify-btn' || target.closest('#minify-btn')) {
            try {
                const result = minifyCss(inputEl?.value || '');
                if (outputEl) outputEl.value = result;
                REOT.utils?.showNotification('压缩成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('压缩失败: ' + error.message, 'error');
            }
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            if (inputEl) inputEl.value = '';
            if (outputEl) outputEl.value = '';
        }

        // 复制按钮
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            if (outputEl?.value) {
                const success = await REOT.utils?.copyToClipboard(outputEl.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }

        // 加载示例
        if (target.id === 'example-btn' || target.closest('#example-btn')) {
            if (inputEl) inputEl.value = loadExample();
        }
    });

    // 导出工具函数
    window.CssTool = { formatCss, minifyCss, tokenize };

})();
