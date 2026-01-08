/**
 * YAML 格式化工具
 * @description YAML 格式化、验证、JSON 互转
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // CodeMirror 编辑器实例
    let inputEditor = null;
    let outputEditor = null;
    let currentOutputLang = 'yaml'; // 跟踪当前输出语言

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

    // js-yaml 库加载 Promise（单例）
    let jsyamlLoadPromise = null;

    /**
     * 动态加载 js-yaml 库
     */
    function loadJsYaml() {
        // 如果已经有加载 Promise，直接返回（避免重复加载）
        if (jsyamlLoadPromise) {
            return jsyamlLoadPromise;
        }

        // 已加载
        if (window.jsyaml) {
            return Promise.resolve();
        }

        jsyamlLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';

            script.onload = () => {
                // 等待全局变量可用
                const checkGlobal = () => {
                    if (window.jsyaml) {
                        resolve();
                    } else {
                        setTimeout(checkGlobal, 10);
                    }
                };
                checkGlobal();
            };

            script.onerror = () => {
                jsyamlLoadPromise = null; // 允许重试
                reject(new Error('无法加载 js-yaml 库，请检查网络连接'));
            };

            document.head.appendChild(script);
        });

        return jsyamlLoadPromise;
    }

    /**
     * 确保库已加载
     */
    async function ensureLibraryLoaded() {
        if (!window.jsyaml) {
            await loadJsYaml();
        }
        // 再次确认
        if (!window.jsyaml) {
            throw new Error('js-yaml 库加载失败');
        }
    }

    /**
     * 获取缩进数量
     */
    function getIndent() {
        const indentSelect = document.getElementById('indent-select');
        return parseInt(indentSelect?.value || '2', 10);
    }

    /**
     * 获取行宽
     */
    function getLineWidth() {
        const lineWidth = document.getElementById('line-width');
        return parseInt(lineWidth?.value || '120', 10);
    }

    /**
     * 递归排序对象键名
     */
    function sortObjectKeys(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(sortObjectKeys);
        }
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = sortObjectKeys(obj[key]);
        });
        return sorted;
    }

    /**
     * 解析 YAML
     */
    function parseYAML(yamlString) {
        if (!yamlString.trim()) {
            return null;
        }

        try {
            return window.jsyaml.load(yamlString);
        } catch (error) {
            throw new Error(`YAML 解析错误: ${error.message}`);
        }
    }

    /**
     * 格式化 YAML
     */
    function formatYAML(input) {
        if (!input.trim()) {
            return '';
        }

        let data;

        // 尝试解析为 YAML
        try {
            data = window.jsyaml.load(input);
        } catch (e) {
            // 尝试解析为 JSON
            try {
                data = JSON.parse(input);
            } catch (e2) {
                throw new Error(`解析失败: ${e.message}`);
            }
        }

        const sortKeys = document.getElementById('sort-keys')?.checked;
        if (sortKeys) {
            data = sortObjectKeys(data);
        }

        return window.jsyaml.dump(data, {
            indent: getIndent(),
            lineWidth: getLineWidth(),
            sortKeys: sortKeys
        });
    }

    /**
     * YAML 转 JSON
     */
    function yamlToJson(yamlString) {
        if (!yamlString.trim()) {
            return '';
        }

        const data = parseYAML(yamlString);
        const sortKeys = document.getElementById('sort-keys')?.checked;

        let result = data;
        if (sortKeys) {
            result = sortObjectKeys(data);
        }

        return JSON.stringify(result, null, getIndent());
    }

    /**
     * JSON 转 YAML
     */
    function jsonToYaml(jsonString) {
        if (!jsonString.trim()) {
            return '';
        }

        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (error) {
            throw new Error(`JSON 解析错误: ${error.message}`);
        }

        const sortKeys = document.getElementById('sort-keys')?.checked;
        if (sortKeys) {
            data = sortObjectKeys(data);
        }

        return window.jsyaml.dump(data, {
            indent: getIndent(),
            lineWidth: getLineWidth(),
            sortKeys: sortKeys
        });
    }

    /**
     * 验证 YAML
     */
    function validateYAML(yamlString) {
        if (!yamlString.trim()) {
            return { valid: false, message: '输入为空' };
        }

        try {
            window.jsyaml.load(yamlString);
            return { valid: true, message: 'YAML 格式正确' };
        } catch (error) {
            return { valid: false, message: error.message };
        }
    }

    /**
     * 语法高亮
     */
    function syntaxHighlight(text, isJson = false) {
        if (!text) return '';

        // 转义 HTML
        let highlighted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        if (isJson) {
            // JSON 高亮
            highlighted = highlighted.replace(
                /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
                function(match) {
                    let cls = 'yaml-number';
                    if (/^"/.test(match)) {
                        if (/:$/.test(match)) {
                            cls = 'yaml-key';
                            return '<span class="' + cls + '">' + match.slice(0, -1) + '</span><span class="yaml-colon">:</span>';
                        } else {
                            cls = 'yaml-string';
                        }
                    } else if (/true|false/.test(match)) {
                        cls = 'yaml-boolean';
                    } else if (/null/.test(match)) {
                        cls = 'yaml-null';
                    }
                    return '<span class="' + cls + '">' + match + '</span>';
                }
            );
        } else {
            // YAML 高亮
            const lines = highlighted.split('\n');
            highlighted = lines.map(line => {
                // 注释
                if (line.trim().startsWith('#')) {
                    return '<span class="yaml-comment">' + line + '</span>';
                }

                // 键值对
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex);
                    const value = line.substring(colonIndex + 1);

                    let highlightedValue = value;

                    // 字符串值
                    if (value.trim().startsWith('"') || value.trim().startsWith("'")) {
                        highlightedValue = '<span class="yaml-string">' + value + '</span>';
                    }
                    // 布尔值
                    else if (/^\s*(true|false|yes|no|on|off)\s*$/i.test(value)) {
                        highlightedValue = '<span class="yaml-boolean">' + value + '</span>';
                    }
                    // null
                    else if (/^\s*(null|~)\s*$/i.test(value)) {
                        highlightedValue = '<span class="yaml-null">' + value + '</span>';
                    }
                    // 数字
                    else if (/^\s*-?\d+(\.\d+)?([eE][+-]?\d+)?\s*$/.test(value)) {
                        highlightedValue = '<span class="yaml-number">' + value + '</span>';
                    }
                    // 普通字符串
                    else if (value.trim()) {
                        highlightedValue = '<span class="yaml-string">' + value + '</span>';
                    }

                    return '<span class="yaml-key">' + key + '</span><span class="yaml-colon">:</span>' + highlightedValue;
                }

                // 列表项
                if (line.trim().startsWith('-')) {
                    const dashIndex = line.indexOf('-');
                    const indent = line.substring(0, dashIndex);
                    const content = line.substring(dashIndex + 1);
                    return indent + '<span class="yaml-dash">-</span>' + content;
                }

                return line;
            }).join('\n');
        }

        return highlighted;
    }

    /**
     * 显示高亮输出
     */
    async function showHighlightedOutput(text, isJson = false) {
        // 如果输出语言改变，需要重新创建输出编辑器
        const newLang = isJson ? 'json' : 'yaml';
        if (outputEditor && currentOutputLang !== newLang && REOT.CodeEditor) {
            try {
                outputEditor.destroy();
                const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
                outputEditor = await REOT.CodeEditor.create('#output-editor', {
                    language: newLang,
                    value: text,
                    readOnly: true,
                    theme: theme
                });
                currentOutputLang = newLang;
                return;
            } catch (e) {
                console.error('Failed to recreate output editor:', e);
            }
        }
        setOutputValue(text);
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

    // 检查当前是否在 YAML 工具页面
    function isYamlToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/formatting/yaml');
    }

    // 事件委托处理器
    document.addEventListener('click', async (e) => {
        // 只在 YAML 工具页面处理事件
        if (!isYamlToolActive()) return;

        const target = e.target;

        // 格式化按钮
        if (target.id === 'format-btn' || target.closest('#format-btn')) {
            try {
                await ensureLibraryLoaded();
                const result = formatYAML(getInputValue());
                await showHighlightedOutput(result, false);
                document.getElementById('validation-section').style.display = 'none';
            } catch (error) {
                showError(error.message);
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 校验按钮
        if (target.id === 'validate-btn' || target.closest('#validate-btn')) {
            try {
                await ensureLibraryLoaded();
                const result = validateYAML(getInputValue());
                showValidationResult(result);
                if (result.valid) {
                    REOT.utils?.showNotification(result.message, 'success');
                } else {
                    REOT.utils?.showNotification(result.message, 'error');
                }
            } catch (error) {
                showError(error.message);
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 转为 JSON
        if (target.id === 'to-json-btn' || target.closest('#to-json-btn')) {
            try {
                await ensureLibraryLoaded();
                const result = yamlToJson(getInputValue());
                await showHighlightedOutput(result, true);
                document.getElementById('validation-section').style.display = 'none';
            } catch (error) {
                showError(error.message);
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // JSON 转 YAML
        if (target.id === 'from-json-btn' || target.closest('#from-json-btn')) {
            try {
                await ensureLibraryLoaded();
                const result = jsonToYaml(getInputValue());
                await showHighlightedOutput(result, false);
                document.getElementById('validation-section').style.display = 'none';
            } catch (error) {
                showError(error.message);
                REOT.utils?.showNotification(error.message, 'error');
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
    window.YamlTool = {
        format: formatYAML,
        parse: parseYAML,
        validate: validateYAML,
        toJson: yamlToJson,
        fromJson: jsonToYaml
    };

    // 默认示例数据
    const sampleYaml = `# REOT 配置示例
name: REOT
version: "1.0.0"
description: 逆向工程在线工具箱

features:
  - 编码解码
  - 加密解密
  - 格式化
  - 协议解析

author:
  name: Evil0ctal
  github: https://github.com/Evil0ctal

settings:
  theme: auto
  language: zh-CN
  debug: false

tools:
  encoding:
    - base64
    - url-encode
    - hex
  hashing:
    - md5
    - sha256
`;

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
                inputEl.value = sampleYaml;
            }
            if (outputEl) outputEl.style.display = 'block';
            return;
        }

        try {
            const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

            // 创建输入编辑器
            inputEditor = await REOT.CodeEditor.create('#input-editor', {
                language: 'yaml',
                value: sampleYaml,
                readOnly: false,
                theme: theme
            });

            // 创建输出编辑器（只读）
            outputEditor = await REOT.CodeEditor.create('#output-editor', {
                language: 'yaml',
                value: '',
                readOnly: true,
                theme: theme
            });

            currentOutputLang = 'yaml';
            console.log('YAML editors initialized');
        } catch (error) {
            console.error('Failed to initialize editors:', error);
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl) {
                inputEl.style.display = 'block';
                inputEl.value = sampleYaml;
            }
            if (outputEl) outputEl.style.display = 'block';
        }
    }

    // 初始化编辑器
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isYamlToolActive()) {
                initEditors();
            }
        });
    } else {
        if (isYamlToolActive()) {
            initEditors();
        }
    }

    // 监听路由变化重新初始化
    window.addEventListener('routeChange', () => {
        if (isYamlToolActive() && !inputEditor) {
            initEditors();
        }
    });

    // 预加载 js-yaml 库
    loadJsYaml().catch(err => console.warn('js-yaml 预加载失败:', err.message));

})();
