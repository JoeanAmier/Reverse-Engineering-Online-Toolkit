/**
 * URL 编解码工具
 * @description URL 编码与解码
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const encodeBtnEl = document.getElementById('encode-btn');
    const decodeBtnEl = document.getElementById('decode-btn');
    const swapBtnEl = document.getElementById('swap-btn');
    const clearBtnEl = document.getElementById('clear-btn');
    const copyBtnEl = document.getElementById('copy-btn');

    function getUrlType() {
        const typeRadio = document.querySelector('input[name="url-type"]:checked');
        return typeRadio ? typeRadio.value : 'component';
    }

    function encode(input) {
        if (!input) {
            return '';
        }
        try {
            const type = getUrlType();
            if (type === 'full') {
                return encodeURI(input);
            }
            return encodeURIComponent(input);
        } catch (error) {
            throw new Error(`${REOT.i18n?.t('tools.url-encode.encodeFailed') || '编码失败'}: ${error.message}`);
        }
    }

    function decode(input) {
        if (!input) {
            return '';
        }
        try {
            const type = getUrlType();
            if (type === 'full') {
                return decodeURI(input);
            }
            return decodeURIComponent(input);
        } catch (error) {
            throw new Error(`${REOT.i18n?.t('tools.url-encode.decodeFailed') || '解码失败'}: ${error.message}`);
        }
    }

    if (encodeBtnEl) {
        encodeBtnEl.addEventListener('click', () => {
            try {
                outputEl.value = encode(inputEl.value);
            } catch (error) {
                outputEl.value = error.message;
                REOT.utils?.showNotification(error.message, 'error');
            }
        });
    }

    if (decodeBtnEl) {
        decodeBtnEl.addEventListener('click', () => {
            try {
                outputEl.value = decode(inputEl.value);
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
            }
        });
    }

    window.UrlEncodeTool = { encode, decode };

    // 设置默认示例数据
    if (inputEl && !inputEl.value) {
        inputEl.value = 'https://example.com/search?q=hello world&name=你好&emoji=🎉';
    }
})();
