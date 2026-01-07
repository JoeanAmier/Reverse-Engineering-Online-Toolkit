/**
 * HMAC 计算工具
 * @description 基于哈希的消息认证码计算
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const algorithmSelect = document.getElementById('algorithm');
    const outputFormatSelect = document.getElementById('output-format');
    const keyInput = document.getElementById('key-input');
    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const calculateBtn = document.getElementById('calculate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    /**
     * 字符串转 ArrayBuffer
     */
    function strToBuffer(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * ArrayBuffer 转 Hex
     */
    function bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * ArrayBuffer 转 Base64
     */
    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    }

    /**
     * 计算 HMAC
     */
    async function calculateHMAC(message, key, algorithm) {
        const keyData = strToBuffer(key);
        const messageData = strToBuffer(message);

        // 导入密钥
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: algorithm },
            false,
            ['sign']
        );

        // 计算签名
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        return signature;
    }

    /**
     * 格式化输出
     */
    function formatOutput(buffer, format) {
        switch (format) {
            case 'hex':
                return bufferToHex(buffer);
            case 'hex-upper':
                return bufferToHex(buffer).toUpperCase();
            case 'base64':
                return bufferToBase64(buffer);
            default:
                return bufferToHex(buffer);
        }
    }

    /**
     * 执行计算
     */
    async function calculate() {
        const message = inputEl.value;
        const key = keyInput.value;
        const algorithm = algorithmSelect.value;
        const format = outputFormatSelect.value;

        if (!key) {
            outputEl.value = '请输入密钥';
            return;
        }

        if (!message) {
            outputEl.value = '请输入消息';
            return;
        }

        try {
            const result = await calculateHMAC(message, key, algorithm);
            outputEl.value = formatOutput(result, format);
        } catch (error) {
            outputEl.value = '计算失败: ' + error.message;
        }
    }

    // 事件监听
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculate);
    }

    // 实时计算
    [inputEl, keyInput, algorithmSelect, outputFormatSelect].forEach(el => {
        if (el) {
            el.addEventListener('input', () => {
                if (inputEl.value && keyInput.value) {
                    calculate();
                }
            });
            el.addEventListener('change', () => {
                if (inputEl.value && keyInput.value) {
                    calculate();
                }
            });
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            keyInput.value = '';
            inputEl.value = '';
            outputEl.value = '';
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            if (outputEl.value) {
                const success = await REOT.utils?.copyToClipboard(outputEl.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        });
    }

    // 设置默认示例
    if (keyInput && !keyInput.value) {
        keyInput.value = 'secret-key';
    }
    if (inputEl && !inputEl.value) {
        inputEl.value = 'Hello, HMAC!';
        calculate();
    }

    // 导出到全局
    window.HMACTool = { calculateHMAC };
})();
