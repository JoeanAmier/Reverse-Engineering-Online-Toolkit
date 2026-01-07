/**
 * CRC计算器
 * @description 计算CRC校验值
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // CRC 算法参数
    const CRC_PARAMS = {
        'crc8': {
            name: 'CRC-8',
            width: 8,
            poly: 0x07,
            init: 0x00,
            refIn: false,
            refOut: false,
            xorOut: 0x00
        },
        'crc16': {
            name: 'CRC-16 (IBM)',
            width: 16,
            poly: 0x8005,
            init: 0x0000,
            refIn: true,
            refOut: true,
            xorOut: 0x0000
        },
        'crc16-ccitt': {
            name: 'CRC-16 CCITT',
            width: 16,
            poly: 0x1021,
            init: 0xFFFF,
            refIn: false,
            refOut: false,
            xorOut: 0x0000
        },
        'crc16-modbus': {
            name: 'CRC-16 Modbus',
            width: 16,
            poly: 0x8005,
            init: 0xFFFF,
            refIn: true,
            refOut: true,
            xorOut: 0x0000
        },
        'crc32': {
            name: 'CRC-32',
            width: 32,
            poly: 0x04C11DB7,
            init: 0xFFFFFFFF,
            refIn: true,
            refOut: true,
            xorOut: 0xFFFFFFFF
        },
        'crc32c': {
            name: 'CRC-32C',
            width: 32,
            poly: 0x1EDC6F41,
            init: 0xFFFFFFFF,
            refIn: true,
            refOut: true,
            xorOut: 0xFFFFFFFF
        }
    };

    // CRC 表缓存
    const tableCache = {};

    /**
     * 反转位序
     */
    function reflect(value, width) {
        let result = 0;
        for (let i = 0; i < width; i++) {
            if (value & (1 << i)) {
                result |= 1 << (width - 1 - i);
            }
        }
        return result >>> 0;
    }

    /**
     * 生成 CRC 查找表
     */
    function generateTable(params) {
        const key = params.name;
        if (tableCache[key]) {
            return tableCache[key];
        }

        const table = new Uint32Array(256);
        const { width, poly, refIn } = params;
        const topBit = 1 << (width - 1);
        const mask = (1 << width) - 1;

        for (let i = 0; i < 256; i++) {
            let crc = refIn ? reflect(i, 8) << (width - 8) : i << (width - 8);

            for (let j = 0; j < 8; j++) {
                if (crc & topBit) {
                    crc = ((crc << 1) ^ poly) & mask;
                } else {
                    crc = (crc << 1) & mask;
                }
            }

            table[i] = refIn ? reflect(crc, width) : crc;
        }

        tableCache[key] = table;
        return table;
    }

    /**
     * 计算 CRC
     */
    function calculateCRC(data, algorithm) {
        const params = CRC_PARAMS[algorithm];
        if (!params) {
            throw new Error('Unknown algorithm: ' + algorithm);
        }

        const table = generateTable(params);
        const { width, init, refIn, refOut, xorOut } = params;
        const mask = width === 32 ? 0xFFFFFFFF : (1 << width) - 1;

        let crc = init;

        if (refIn) {
            for (let i = 0; i < data.length; i++) {
                const byte = data[i];
                crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF];
            }
        } else {
            for (let i = 0; i < data.length; i++) {
                const byte = data[i];
                const index = ((crc >>> (width - 8)) ^ byte) & 0xFF;
                crc = ((crc << 8) ^ table[index]) & mask;
            }
        }

        if (refIn !== refOut) {
            crc = reflect(crc, width);
        }

        return (crc ^ xorOut) >>> 0;
    }

    /**
     * 解析十六进制字符串
     */
    function parseHex(hex) {
        hex = hex.replace(/\s/g, '');
        if (!/^[0-9a-fA-F]*$/.test(hex)) {
            throw new Error('Invalid hex string');
        }
        if (hex.length % 2 !== 0) {
            hex = '0' + hex;
        }

        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    /**
     * 格式化 CRC 值
     */
    function formatCRC(value, width) {
        const hexLen = Math.ceil(width / 4);
        return {
            decimal: value.toString(),
            hex: value.toString(16).toUpperCase().padStart(hexLen, '0'),
            hexLower: value.toString(16).padStart(hexLen, '0'),
            binary: value.toString(2).padStart(width, '0')
        };
    }

    // DOM 元素
    const inputText = document.getElementById('input-text');
    const inputType = document.getElementById('input-type');
    const crcType = document.getElementById('crc-type');
    const calcBtn = document.getElementById('calc-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultSection = document.getElementById('result-section');
    const resultGrid = document.getElementById('result-grid');

    /**
     * 执行计算
     */
    function calculate() {
        const text = inputText.value;
        if (!text) {
            resultSection.style.display = 'none';
            return;
        }

        try {
            let data;
            if (inputType.value === 'hex') {
                data = parseHex(text);
            } else {
                data = new TextEncoder().encode(text);
            }

            const algorithm = crcType.value;
            const params = CRC_PARAMS[algorithm];
            const crc = calculateCRC(data, algorithm);
            const formatted = formatCRC(crc, params.width);

            const t = window.REOT?.i18n?.t || (key => key.split('.').pop());
            const yes = t('tools.crc.yes');
            const no = t('tools.crc.no');
            const copyText = t('common.copy');

            resultGrid.innerHTML = `
                <div class="result-item">
                    <div class="result-label">${t('tools.crc.decimal')}</div>
                    <div class="result-value">
                        <code>${formatted.decimal}</code>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${formatted.decimal}')">${copyText}</button>
                    </div>
                </div>
                <div class="result-item">
                    <div class="result-label">${t('tools.crc.hexUpper')}</div>
                    <div class="result-value">
                        <code>0x${formatted.hex}</code>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('0x${formatted.hex}')">${copyText}</button>
                    </div>
                </div>
                <div class="result-item">
                    <div class="result-label">${t('tools.crc.hexLower')}</div>
                    <div class="result-value">
                        <code>0x${formatted.hexLower}</code>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('0x${formatted.hexLower}')">${copyText}</button>
                    </div>
                </div>
                <div class="result-item">
                    <div class="result-label">${t('tools.crc.binary')}</div>
                    <div class="result-value">
                        <code>${formatted.binary}</code>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${formatted.binary}')">${copyText}</button>
                    </div>
                </div>
                <div class="crc-info">
                    <h4>${t('tools.crc.algorithmParams')} (${params.name})</h4>
                    <table>
                        <tr><td>${t('tools.crc.width')}</td><td>${params.width} bits</td></tr>
                        <tr><td>${t('tools.crc.polynomial')}</td><td>0x${params.poly.toString(16).toUpperCase()}</td></tr>
                        <tr><td>${t('tools.crc.initValue')}</td><td>0x${params.init.toString(16).toUpperCase()}</td></tr>
                        <tr><td>${t('tools.crc.inputReflect')}</td><td>${params.refIn ? yes : no}</td></tr>
                        <tr><td>${t('tools.crc.outputReflect')}</td><td>${params.refOut ? yes : no}</td></tr>
                        <tr><td>${t('tools.crc.outputXor')}</td><td>0x${params.xorOut.toString(16).toUpperCase()}</td></tr>
                    </table>
                </div>
            `;

            resultSection.style.display = 'block';
        } catch (e) {
            const t = window.REOT?.i18n?.t || (key => key.split('.').pop());
            alert(t('tools.crc.calcFailed') + ': ' + e.message);
        }
    }

    // 事件监听
    calcBtn.addEventListener('click', calculate);

    clearBtn.addEventListener('click', () => {
        inputText.value = '';
        resultSection.style.display = 'none';
    });

    // 默认示例
    if (!inputText.value) {
        inputText.value = 'Hello, World!';
        calculate();
    }

    // 导出到全局
    window.CRCTool = { calculateCRC, CRC_PARAMS };
})();
