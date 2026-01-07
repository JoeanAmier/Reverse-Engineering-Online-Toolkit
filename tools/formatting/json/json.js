/**
 * JSON 格式化工具
 * @description JSON 格式化、压缩、校验
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const formatBtnEl = document.getElementById('format-btn');
    const minifyBtnEl = document.getElementById('minify-btn');
    const clearBtnEl = document.getElementById('clear-btn');
    const copyBtnEl = document.getElementById('copy-btn');
    const indentSelectEl = document.getElementById('indent-select');
    const sortKeysEl = document.getElementById('sort-keys');

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

    function format(input) {
        if (!input.trim()) {
            return '';
        }
        try {
            let obj = JSON.parse(input);

            if (sortKeysEl && sortKeysEl.checked) {
                obj = sortObjectKeys(obj);
            }

            let indent = indentSelectEl ? indentSelectEl.value : 4;
            if (indent === '\\t') {
                indent = '\t';
            } else {
                indent = parseInt(indent, 10);
            }

            return JSON.stringify(obj, null, indent);
        } catch (error) {
            throw new Error(`JSON 解析错误: ${error.message}`);
        }
    }

    function minify(input) {
        if (!input.trim()) {
            return '';
        }
        try {
            const obj = JSON.parse(input);
            return JSON.stringify(obj);
        } catch (error) {
            throw new Error(`JSON 解析错误: ${error.message}`);
        }
    }

    if (formatBtnEl) {
        formatBtnEl.addEventListener('click', () => {
            try {
                outputEl.value = format(inputEl.value);
            } catch (error) {
                outputEl.value = error.message;
                REOT.utils?.showNotification(error.message, 'error');
            }
        });
    }

    if (minifyBtnEl) {
        minifyBtnEl.addEventListener('click', () => {
            try {
                outputEl.value = minify(inputEl.value);
            } catch (error) {
                outputEl.value = error.message;
                REOT.utils?.showNotification(error.message, 'error');
            }
        });
    }

    if (clearBtnEl) {
        clearBtnEl.addEventListener('click', () => {
            inputEl.value = '';
            outputEl.value = '';
        });
    }

    if (copyBtnEl) {
        copyBtnEl.addEventListener('click', async () => {
            const success = await REOT.utils?.copyToClipboard(outputEl.value);
            if (success) {
                REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
            }
        });
    }

    window.JsonTool = { format, minify, sortObjectKeys };
})();
