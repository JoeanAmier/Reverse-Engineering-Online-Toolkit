/**
 * RC4 加解密工具
 * @description RC4 流加密算法实现
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * 检查当前是否在 RC4 工具页面
     */
    function isRc4ToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/encryption/rc4');
    }

    /**
     * RC4 密钥调度算法 (KSA)
     * @param {Uint8Array} key - 密钥字节数组
     * @returns {Uint8Array} - 初始化后的 S 盒
     */
    function ksa(key) {
        const S = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            S[i] = i;
        }

        let j = 0;
        for (let i = 0; i < 256; i++) {
            j = (j + S[i] + key[i % key.length]) % 256;
            // 交换 S[i] 和 S[j]
            [S[i], S[j]] = [S[j], S[i]];
        }

        return S;
    }

    /**
     * RC4 伪随机生成算法 (PRGA)
     * @param {Uint8Array} S - S 盒
     * @param {number} length - 需要生成的字节数
     * @returns {Uint8Array} - 伪随机字节流
     */
    function prga(S, length) {
        const stream = new Uint8Array(length);
        let i = 0, j = 0;

        for (let k = 0; k < length; k++) {
            i = (i + 1) % 256;
            j = (j + S[i]) % 256;
            // 交换 S[i] 和 S[j]
            [S[i], S[j]] = [S[j], S[i]];
            stream[k] = S[(S[i] + S[j]) % 256];
        }

        return stream;
    }

    /**
     * RC4 加密/解密 (相同操作)
     * @param {Uint8Array} data - 输入数据
     * @param {Uint8Array} key - 密钥
     * @returns {Uint8Array} - 输出数据
     */
    function rc4(data, key) {
        if (key.length === 0) {
            throw new Error('密钥不能为空');
        }
        if (key.length > 256) {
            throw new Error('密钥长度不能超过 256 字节');
        }

        const S = ksa(key);
        const keystream = prga(S, data.length);
        const output = new Uint8Array(data.length);

        for (let i = 0; i < data.length; i++) {
            output[i] = data[i] ^ keystream[i];
        }

        return output;
    }

    /**
     * 字符串转 Uint8Array (UTF-8)
     */
    function stringToBytes(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * Uint8Array 转字符串 (UTF-8)
     */
    function bytesToString(bytes) {
        return new TextDecoder().decode(bytes);
    }

    /**
     * Hex 字符串转 Uint8Array
     */
    function hexToBytes(hex) {
        hex = hex.replace(/\s/g, '');
        if (hex.length % 2 !== 0) {
            throw new Error('无效的 Hex 字符串');
        }
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    /**
     * Uint8Array 转 Hex 字符串
     */
    function bytesToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Base64 转 Uint8Array
     */
    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Uint8Array 转 Base64
     */
    function bytesToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * 生成随机密钥
     */
    function generateRandomKey(length = 16) {
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        return bytesToHex(bytes);
    }

    /**
     * 解析输入数据
     */
    function parseInput(input, format) {
        switch (format) {
            case 'hex':
                return hexToBytes(input);
            case 'base64':
                return base64ToBytes(input);
            case 'text':
            default:
                return stringToBytes(input);
        }
    }

    /**
     * 格式化输出数据
     */
    function formatOutput(bytes, format) {
        switch (format) {
            case 'hex':
                return bytesToHex(bytes);
            case 'base64':
                return bytesToBase64(bytes);
            case 'text':
            default:
                try {
                    return bytesToString(bytes);
                } catch (e) {
                    // 如果无法解码为 UTF-8，返回 Hex
                    return bytesToHex(bytes);
                }
        }
    }

    /**
     * 处理加密/解密
     */
    function process() {
        const inputEl = document.getElementById('input');
        const outputEl = document.getElementById('output');
        const keyInput = document.getElementById('key-input');
        const inputFormat = document.getElementById('input-format')?.value || 'text';
        const outputFormat = document.getElementById('output-format')?.value || 'hex';

        if (!inputEl?.value.trim()) {
            throw new Error('请输入要处理的内容');
        }

        if (!keyInput?.value.trim()) {
            throw new Error('请输入密钥');
        }

        // 解析输入
        const inputBytes = parseInput(inputEl.value.trim(), inputFormat);

        // 解析密钥 (支持 Hex 或文本)
        let keyBytes;
        const keyStr = keyInput.value.trim();
        if (/^[0-9a-fA-F]+$/.test(keyStr) && keyStr.length % 2 === 0) {
            keyBytes = hexToBytes(keyStr);
        } else {
            keyBytes = stringToBytes(keyStr);
        }

        // RC4 处理
        const outputBytes = rc4(inputBytes, keyBytes);

        // 格式化输出
        const result = formatOutput(outputBytes, outputFormat);

        if (outputEl) {
            outputEl.value = result;
        }

        return result;
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isRc4ToolActive()) return;

        const target = e.target;

        // 生成密钥
        if (target.id === 'generate-key-btn' || target.closest('#generate-key-btn')) {
            const keyInput = document.getElementById('key-input');
            if (keyInput) {
                keyInput.value = generateRandomKey(16);
            }
        }

        // 处理按钮
        if (target.id === 'process-btn' || target.closest('#process-btn')) {
            try {
                process();
                REOT.utils?.showNotification('处理成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
                const outputEl = document.getElementById('output');
                if (outputEl) outputEl.value = '错误: ' + error.message;
            }
        }

        // 交换按钮
        if (target.id === 'swap-btn' || target.closest('#swap-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            const inputFormat = document.getElementById('input-format');
            const outputFormat = document.getElementById('output-format');

            if (inputEl && outputEl) {
                const temp = inputEl.value;
                inputEl.value = outputEl.value;
                outputEl.value = temp;
            }

            // 交换格式
            if (inputFormat && outputFormat) {
                const tempFormat = inputFormat.value;
                inputFormat.value = outputFormat.value;
                outputFormat.value = tempFormat;
            }
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl) inputEl.value = '';
            if (outputEl) outputEl.value = '';
        }

        // 复制按钮
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            const outputEl = document.getElementById('output');
            if (outputEl?.value) {
                const success = await REOT.utils?.copyToClipboard(outputEl.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }
    });

    // 初始化
    function init() {
        const inputEl = document.getElementById('input');
        const keyInput = document.getElementById('key-input');

        if (inputEl && !inputEl.value) {
            inputEl.value = 'Hello, RC4 Encryption! 你好，RC4 加密！';
        }
        if (keyInput && !keyInput.value) {
            keyInput.value = 'mysecretkey';
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出工具函数
    window.RC4Tool = { rc4, process };

})();
