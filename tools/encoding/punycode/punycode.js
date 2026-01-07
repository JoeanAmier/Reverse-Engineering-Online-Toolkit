/**
 * Punycode 编解码工具
 * @description 国际化域名 Punycode 编解码
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // Punycode 参数
    const BASE = 36;
    const TMIN = 1;
    const TMAX = 26;
    const SKEW = 38;
    const DAMP = 700;
    const INITIAL_BIAS = 72;
    const INITIAL_N = 128;
    const DELIMITER = '-';

    // DOM 元素
    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const encodeBtn = document.getElementById('encode-btn');
    const decodeBtn = document.getElementById('decode-btn');
    const swapBtn = document.getElementById('swap-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    /**
     * 基础编码字符
     */
    function digitToBasic(digit) {
        return digit + 22 + 75 * (digit < 26);
    }

    /**
     * 基础解码字符
     */
    function basicToDigit(cp) {
        if (cp - 48 < 10) return cp - 22;
        if (cp - 65 < 26) return cp - 65;
        if (cp - 97 < 26) return cp - 97;
        return BASE;
    }

    /**
     * 适配偏移
     */
    function adapt(delta, numPoints, firstTime) {
        delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
        delta += Math.floor(delta / numPoints);
        let k = 0;
        while (delta > ((BASE - TMIN) * TMAX) >> 1) {
            delta = Math.floor(delta / (BASE - TMIN));
            k += BASE;
        }
        return k + Math.floor((BASE - TMIN + 1) * delta / (delta + SKEW));
    }

    /**
     * Punycode 编码
     */
    function encode(input) {
        const output = [];
        const inputLength = input.length;
        let n = INITIAL_N;
        let delta = 0;
        let bias = INITIAL_BIAS;

        // 处理基础字符
        for (let i = 0; i < inputLength; i++) {
            const c = input.charCodeAt(i);
            if (c < 128) {
                output.push(String.fromCharCode(c));
            }
        }

        const basicLength = output.length;
        let handledCPCount = basicLength;

        if (basicLength > 0) {
            output.push(DELIMITER);
        }

        while (handledCPCount < inputLength) {
            let m = 0x7FFFFFFF;
            for (let i = 0; i < inputLength; i++) {
                const c = input.charCodeAt(i);
                if (c >= n && c < m) {
                    m = c;
                }
            }

            delta += (m - n) * (handledCPCount + 1);
            n = m;

            for (let i = 0; i < inputLength; i++) {
                const c = input.charCodeAt(i);
                if (c < n) {
                    delta++;
                }
                if (c === n) {
                    let q = delta;
                    for (let k = BASE; ; k += BASE) {
                        const t = k <= bias ? TMIN : (k >= bias + TMAX ? TMAX : k - bias);
                        if (q < t) break;
                        output.push(String.fromCharCode(digitToBasic(t + (q - t) % (BASE - t))));
                        q = Math.floor((q - t) / (BASE - t));
                    }
                    output.push(String.fromCharCode(digitToBasic(q)));
                    bias = adapt(delta, handledCPCount + 1, handledCPCount === basicLength);
                    delta = 0;
                    handledCPCount++;
                }
            }
            delta++;
            n++;
        }

        return output.join('');
    }

    /**
     * Punycode 解码
     */
    function decode(input) {
        const output = [];
        const inputLength = input.length;
        let i = 0;
        let n = INITIAL_N;
        let bias = INITIAL_BIAS;

        // 查找最后一个分隔符
        let basic = input.lastIndexOf(DELIMITER);
        if (basic < 0) basic = 0;

        // 复制基础字符
        for (let j = 0; j < basic; j++) {
            const c = input.charCodeAt(j);
            if (c >= 128) throw new Error('Invalid input');
            output.push(input.charAt(j));
        }

        // 主解码循环
        for (let idx = basic > 0 ? basic + 1 : 0; idx < inputLength; ) {
            const oldi = i;
            let w = 1;
            for (let k = BASE; ; k += BASE) {
                if (idx >= inputLength) throw new Error('Invalid input');
                const digit = basicToDigit(input.charCodeAt(idx++));
                if (digit >= BASE) throw new Error('Invalid input');
                i += digit * w;
                const t = k <= bias ? TMIN : (k >= bias + TMAX ? TMAX : k - bias);
                if (digit < t) break;
                w *= BASE - t;
            }
            const out = output.length + 1;
            bias = adapt(i - oldi, out, oldi === 0);
            n += Math.floor(i / out);
            i %= out;
            output.splice(i, 0, String.fromCodePoint(n));
            i++;
        }

        return output.join('');
    }

    /**
     * 编码域名
     */
    function encodeDomain(domain) {
        return domain.split('.').map(label => {
            // 检查是否需要编码
            const needsEncoding = [...label].some(c => c.charCodeAt(0) >= 128);
            if (needsEncoding) {
                return 'xn--' + encode(label);
            }
            return label;
        }).join('.');
    }

    /**
     * 解码域名
     */
    function decodeDomain(domain) {
        return domain.split('.').map(label => {
            if (label.toLowerCase().startsWith('xn--')) {
                return decode(label.slice(4));
            }
            return label;
        }).join('.');
    }

    // 事件监听
    if (encodeBtn) {
        encodeBtn.addEventListener('click', () => {
            try {
                outputEl.value = encodeDomain(inputEl.value);
            } catch (error) {
                outputEl.value = '编码失败: ' + error.message;
            }
        });
    }

    if (decodeBtn) {
        decodeBtn.addEventListener('click', () => {
            try {
                outputEl.value = decodeDomain(inputEl.value);
            } catch (error) {
                outputEl.value = '解码失败: ' + error.message;
            }
        });
    }

    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const temp = inputEl.value;
            inputEl.value = outputEl.value;
            outputEl.value = temp;
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
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
    if (inputEl && !inputEl.value) {
        inputEl.value = '中国.com';
    }

    // 导出到全局
    window.PunycodeTool = { encode, decode, encodeDomain, decodeDomain };
})();
