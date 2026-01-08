/**
 * XML 格式化工具
 * @description XML 格式化、压缩、校验
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // CodeMirror 编辑器实例
    let inputEditor = null;
    let outputEditor = null;

    /**
     * 获取输入值
     */
    function getInputValue() {
        if (inputEditor) {
            return inputEditor.getValue();
        }
        return document.getElementById('input')?.value || '';
    }

    /**
     * 设置输入值
     */
    function setInputValue(value) {
        if (inputEditor) {
            inputEditor.setValue(value);
        }
        const inputEl = document.getElementById('input');
        if (inputEl) {
            inputEl.value = value;
        }
    }

    /**
     * 获取输出值
     */
    function getOutputValue() {
        if (outputEditor) {
            return outputEditor.getValue();
        }
        return document.getElementById('output')?.value || '';
    }

    /**
     * 设置输出值
     */
    function setOutputValue(value) {
        if (outputEditor) {
            outputEditor.setValue(value);
        }
        const outputEl = document.getElementById('output');
        if (outputEl) {
            outputEl.value = value;
        }
    }

    /**
     * 获取缩进字符串
     */
    function getIndent() {
        const indentSelect = document.getElementById('indent-select');
        let indent = indentSelect ? indentSelect.value : '4';
        if (indent === '\\t') {
            return '\t';
        }
        return ' '.repeat(parseInt(indent, 10));
    }

    /**
     * 解析 XML 字符串
     */
    function parseXML(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'application/xml');

        const errorNode = doc.querySelector('parsererror');
        if (errorNode) {
            const errorText = errorNode.textContent;
            throw new Error(errorText);
        }

        return doc;
    }

    /**
     * 格式化 XML
     */
    function formatXML(xmlString) {
        if (!xmlString.trim()) {
            return '';
        }

        const indent = getIndent();
        const preserveComments = document.getElementById('preserve-comments')?.checked ?? true;
        const preserveCDATA = document.getElementById('preserve-cdata')?.checked ?? true;

        // 先验证 XML 是否有效
        parseXML(xmlString);

        // 使用正则表达式进行格式化
        let formatted = '';
        let level = 0;

        // 处理 XML 声明
        const xmlDeclaration = xmlString.match(/<\?xml[^?]*\?>/);
        if (xmlDeclaration) {
            formatted = xmlDeclaration[0] + '\n';
            xmlString = xmlString.replace(xmlDeclaration[0], '');
        }

        // 标记和内容的正则表达式
        const tokenRegex = /(<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<[^>]+>|[^<]+)/g;
        let tokens = xmlString.match(tokenRegex) || [];

        tokens.forEach((token, index) => {
            token = token.trim();
            if (!token) return;

            // 处理注释
            if (token.startsWith('<!--')) {
                if (preserveComments) {
                    formatted += indent.repeat(level) + token + '\n';
                }
                return;
            }

            // 处理 CDATA
            if (token.startsWith('<![CDATA[')) {
                if (preserveCDATA) {
                    formatted += indent.repeat(level) + token + '\n';
                }
                return;
            }

            // 处理关闭标签
            if (token.startsWith('</')) {
                level = Math.max(0, level - 1);
                formatted += indent.repeat(level) + token + '\n';
                return;
            }

            // 处理自闭合标签
            if (token.endsWith('/>') || token.startsWith('<?') || token.startsWith('<!')) {
                formatted += indent.repeat(level) + token + '\n';
                return;
            }

            // 处理开始标签
            if (token.startsWith('<')) {
                formatted += indent.repeat(level) + token + '\n';
                level++;
                return;
            }

            // 处理文本内容
            if (token.trim()) {
                // 检查下一个 token 是否是关闭标签
                const nextToken = tokens[index + 1];
                if (nextToken && nextToken.trim().startsWith('</')) {
                    // 文本内容和关闭标签在同一行
                    formatted = formatted.trimEnd() + token;
                    // 不添加换行，让关闭标签处理时添加
                    level = Math.max(0, level - 1);
                    // 修改下一个 token 的处理
                    tokens[index + 1] = nextToken.trim();
                    formatted += tokens[index + 1] + '\n';
                    tokens[index + 1] = ''; // 标记为已处理
                } else {
                    formatted += indent.repeat(level) + token + '\n';
                }
            }
        });

        return formatted.trim();
    }

    /**
     * 压缩 XML
     */
    function minifyXML(xmlString) {
        if (!xmlString.trim()) {
            return '';
        }

        // 先验证 XML 是否有效
        parseXML(xmlString);

        // 移除多余的空白字符
        let minified = xmlString
            // 移除注释（可选）
            // .replace(/<!--[\s\S]*?-->/g, '')
            // 移除标签之间的空白
            .replace(/>\s+</g, '><')
            // 移除开头和结尾的空白
            .trim();

        return minified;
    }

    /**
     * 验证 XML
     */
    function validateXML(xmlString) {
        if (!xmlString.trim()) {
            return { valid: false, message: '输入为空' };
        }

        try {
            parseXML(xmlString);
            return { valid: true, message: 'XML 格式正确' };
        } catch (error) {
            return { valid: false, message: error.message };
        }
    }

    /**
     * 语法高亮
     */
    function syntaxHighlight(xml) {
        if (!xml) return '';

        // 使用占位符方式避免正则替换冲突
        const placeholders = [];
        let placeholderIndex = 0;

        function addPlaceholder(html) {
            const placeholder = `\x00${placeholderIndex++}\x00`;
            placeholders.push({ placeholder, html });
            return placeholder;
        }

        // 转义 HTML
        let highlighted = xml
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 高亮 XML 声明
        highlighted = highlighted.replace(
            /(&lt;\?xml[^?]*\?&gt;)/g,
            (match) => addPlaceholder(`<span class="xml-declaration">${match}</span>`)
        );

        // 高亮注释
        highlighted = highlighted.replace(
            /(&lt;!--[\s\S]*?--&gt;)/g,
            (match) => addPlaceholder(`<span class="xml-comment">${match}</span>`)
        );

        // 高亮 CDATA
        highlighted = highlighted.replace(
            /(&lt;!\[CDATA\[[\s\S]*?\]\]&gt;)/g,
            (match) => addPlaceholder(`<span class="xml-cdata">${match}</span>`)
        );

        // 高亮属性值（先处理，避免被其他规则干扰）
        highlighted = highlighted.replace(
            /="([^"]*)"/g,
            (match, value) => `=${addPlaceholder(`<span class="xml-attr-value">"${value}"</span>`)}`
        );

        // 高亮属性名
        highlighted = highlighted.replace(
            /(\s)([\w:.-]+)=/g,
            (match, space, name) => `${space}${addPlaceholder(`<span class="xml-attr-name">${name}</span>`)}=`
        );

        // 高亮标签名
        highlighted = highlighted.replace(
            /(&lt;\/?)([\w:.-]+)/g,
            (match, bracket, tag) => `${bracket}${addPlaceholder(`<span class="xml-tag">${tag}</span>`)}`
        );

        // 高亮尖括号
        highlighted = highlighted.replace(
            /(&lt;\/?|\/?\?&gt;|&gt;)/g,
            (match) => addPlaceholder(`<span class="xml-bracket">${match}</span>`)
        );

        // 还原所有占位符
        placeholders.forEach(({ placeholder, html }) => {
            highlighted = highlighted.replace(placeholder, html);
        });

        return highlighted;
    }

    /**
     * 显示高亮输出
     */
    function showHighlightedOutput(xmlStr) {
        setOutputValue(xmlStr);
    }

    /**
     * 显示错误
     */
    function showError(message) {
        setOutputValue(message);
    }

    /**
     * 显示验证结果
     */
    function showValidationResult(result) {
        const validationSection = document.getElementById('validation-section');
        const validationResult = document.getElementById('validation-result');

        if (validationSection && validationResult) {
            validationSection.style.display = 'block';
            validationResult.className = 'validation-result ' + (result.valid ? 'valid' : 'invalid');
            validationResult.innerHTML = `
                <span class="validation-icon">${result.valid ? '✓' : '✗'}</span>
                <span class="validation-message">${result.message}</span>
            `;
        }
    }

    /**
     * 复制到剪贴板
     */
    async function copyToClipboard(text) {
        const success = await REOT.utils?.copyToClipboard(text);
        if (success) {
            REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
        }
    }

    // 检查当前是否在 XML 工具页面
    function isXmlToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/formatting/xml');
    }

    // 事件委托处理器
    document.addEventListener('click', (e) => {
        // 只在 XML 工具页面处理事件
        if (!isXmlToolActive()) return;

        const target = e.target;

        // 格式化按钮
        if (target.id === 'format-btn' || target.closest('#format-btn')) {
            try {
                const result = formatXML(getInputValue());
                showHighlightedOutput(result);
                document.getElementById('validation-section').style.display = 'none';
            } catch (error) {
                showError(error.message);
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 压缩按钮
        if (target.id === 'minify-btn' || target.closest('#minify-btn')) {
            try {
                const result = minifyXML(getInputValue());
                showHighlightedOutput(result);
                document.getElementById('validation-section').style.display = 'none';
            } catch (error) {
                showError(error.message);
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 校验按钮
        if (target.id === 'validate-btn' || target.closest('#validate-btn')) {
            const result = validateXML(getInputValue());
            showValidationResult(result);
            if (result.valid) {
                REOT.utils?.showNotification(result.message, 'success');
            } else {
                REOT.utils?.showNotification(result.message, 'error');
            }
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            setInputValue('');
            setOutputValue('');
            const validationSection = document.getElementById('validation-section');
            if (validationSection) validationSection.style.display = 'none';
        }

        // 复制按钮
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            copyToClipboard(getOutputValue());
        }
    });

    // 导出工具函数
    window.XmlTool = {
        format: formatXML,
        minify: minifyXML,
        validate: validateXML,
        syntaxHighlight
    };

    // 默认示例数据
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
    <book category="fiction">
        <title lang="en">Harry Potter</title>
        <author>J.K. Rowling</author>
        <year>2005</year>
        <price>29.99</price>
    </book>
    <book category="programming">
        <title lang="en">Learning XML</title>
        <author>Erik T. Ray</author>
        <year>2003</year>
        <price>39.95</price>
    </book>
</bookstore>`;

    /**
     * 初始化 CodeMirror 编辑器
     */
    async function initEditors() {
        if (!REOT.CodeEditor) {
            console.warn('CodeEditor not available, using textarea fallback');
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl) {
                inputEl.style.display = 'block';
                inputEl.value = sampleXml;
            }
            if (outputEl) outputEl.style.display = 'block';
            return;
        }

        try {
            const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

            // 创建输入编辑器
            inputEditor = await REOT.CodeEditor.create('#input-editor', {
                language: 'xml',
                value: sampleXml,
                readOnly: false,
                theme: theme
            });

            // 创建输出编辑器（只读）
            outputEditor = await REOT.CodeEditor.create('#output-editor', {
                language: 'xml',
                value: '',
                readOnly: true,
                theme: theme
            });

            console.log('XML editors initialized');
        } catch (error) {
            console.error('Failed to initialize editors:', error);
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl) {
                inputEl.style.display = 'block';
                inputEl.value = sampleXml;
            }
            if (outputEl) outputEl.style.display = 'block';
        }
    }

    // 初始化编辑器
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isXmlToolActive()) {
                initEditors();
            }
        });
    } else {
        if (isXmlToolActive()) {
            initEditors();
        }
    }

    // 监听路由变化重新初始化
    window.addEventListener('routeChange', () => {
        if (isXmlToolActive() && !inputEditor) {
            initEditors();
        }
    });

})();
