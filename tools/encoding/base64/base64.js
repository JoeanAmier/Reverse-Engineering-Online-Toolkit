/**
 * Base64 编解码工具
 * @description Base64 编码与解码，支持标准 Base64 和 URL 安全的 Base64
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const encodeBtnEl = document.getElementById('encode-btn');
    const decodeBtnEl = document.getElementById('decode-btn');
    const swapBtnEl = document.getElementById('swap-btn');
    const clearBtnEl = document.getElementById('clear-btn');
    const copyBtnEl = document.getElementById('copy-btn');

    /**
     * 获取当前选择的Base64类型
     * @returns {string} - 'standard' 或 'urlsafe'
     */
    function getBase64Type() {
        const typeRadio = document.querySelector('input[name="base64-type"]:checked');
        return typeRadio ? typeRadio.value : 'standard';
    }

    /**
     * 标准Base64编码
     * @param {string} input - 输入字符串
     * @returns {string} - 编码后的字符串
     */
    function encodeStandard(input) {
        // 使用 TextEncoder 处理 UTF-8
        const bytes = new TextEncoder().encode(input);
        let binary = '';
        bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary);
    }

    /**
     * 标准Base64解码
     * @param {string} input - 编码后的字符串
     * @returns {string} - 解码后的字符串
     */
    function decodeStandard(input) {
        const binary = atob(input);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }

    /**
     * URL安全Base64编码
     * @param {string} input - 输入字符串
     * @returns {string} - 编码后的字符串
     */
    function encodeUrlSafe(input) {
        const standard = encodeStandard(input);
        return standard
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * URL安全Base64解码
     * @param {string} input - 编码后的字符串
     * @returns {string} - 解码后的字符串
     */
    function decodeUrlSafe(input) {
        // 还原标准Base64
        let standard = input
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        // 补全填充
        const padding = standard.length % 4;
        if (padding) {
            standard += '='.repeat(4 - padding);
        }

        return decodeStandard(standard);
    }

    /**
     * 编码函数
     * @param {string} input - 输入字符串
     * @returns {string} - 编码后的字符串
     */
    function encode(input) {
        if (!input) {
            return '';
        }

        try {
            const type = getBase64Type();
            if (type === 'urlsafe') {
                return encodeUrlSafe(input);
            }
            return encodeStandard(input);
        } catch (error) {
            throw new Error(`编码失败: ${error.message}`);
        }
    }

    /**
     * 解码函数
     * @param {string} input - 编码后的字符串
     * @returns {string} - 解码后的字符串
     */
    function decode(input) {
        if (!input) {
            return '';
        }

        try {
            const type = getBase64Type();
            if (type === 'urlsafe') {
                return decodeUrlSafe(input);
            }
            return decodeStandard(input);
        } catch (error) {
            throw new Error(`解码失败: ${error.message}`);
        }
    }

    // 事件监听
    if (encodeBtnEl) {
        encodeBtnEl.addEventListener('click', () => {
            try {
                const result = encode(inputEl.value);
                outputEl.value = result;
            } catch (error) {
                outputEl.value = error.message;
                REOT.utils?.showNotification(error.message, 'error');
            }
        });
    }

    if (decodeBtnEl) {
        decodeBtnEl.addEventListener('click', () => {
            try {
                const result = decode(inputEl.value);
                outputEl.value = result;
            } catch (error) {
                outputEl.value = error.message;
                REOT.utils?.showNotification(error.message, 'error');
            }
        });
    }

    if (swapBtnEl) {
        swapBtnEl.addEventListener('click', () => {
            const temp = inputEl.value;
            inputEl.value = outputEl.value;
            outputEl.value = temp;
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
            } else {
                REOT.utils?.showNotification(REOT.i18n?.t('common.copyFailed') || '复制失败', 'error');
            }
        });
    }

    // 导出到全局（用于测试）
    window.Base64Tool = {
        encode,
        decode,
        encodeStandard,
        decodeStandard,
        encodeUrlSafe,
        decodeUrlSafe
    };

})();
