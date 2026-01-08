/**
 * 字节序转换工具
 * @description 大端序与小端序互转
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * 检查当前是否在字节序工具页面
     */
    function isByteOrderToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/binary/byte-order');
    }

    /**
     * 获取数据类型信息
     */
    function getDataTypeInfo(type) {
        const types = {
            'int16': { bytes: 2, signed: true, float: false },
            'uint16': { bytes: 2, signed: false, float: false },
            'int32': { bytes: 4, signed: true, float: false },
            'uint32': { bytes: 4, signed: false, float: false },
            'int64': { bytes: 8, signed: true, float: false },
            'uint64': { bytes: 8, signed: false, float: false },
            'float32': { bytes: 4, signed: true, float: true },
            'float64': { bytes: 8, signed: true, float: true },
            'hex': { bytes: 0, signed: false, float: false }
        };
        return types[type] || types['int32'];
    }

    /**
     * 解析输入值
     */
    function parseInputValue(input, format, dataType) {
        input = input.trim();
        if (!input) return null;

        const typeInfo = getDataTypeInfo(dataType);

        // Hex 类型特殊处理
        if (dataType === 'hex') {
            input = input.replace(/\s/g, '').replace(/^0x/i, '');
            if (!/^[0-9a-fA-F]*$/.test(input)) {
                throw new Error('无效的十六进制字符串');
            }
            // 确保偶数长度
            if (input.length % 2 !== 0) {
                input = '0' + input;
            }
            return hexToBytes(input);
        }

        let value;
        switch (format) {
            case 'hex':
                input = input.replace(/^0x/i, '');
                value = BigInt('0x' + input);
                break;
            case 'binary':
                input = input.replace(/^0b/i, '');
                value = BigInt('0b' + input);
                break;
            default: // decimal
                if (typeInfo.float) {
                    return parseFloat(input);
                }
                value = BigInt(input);
        }

        return value;
    }

    /**
     * 将数值转换为字节数组 (大端序)
     */
    function valueToBytesBE(value, dataType) {
        const typeInfo = getDataTypeInfo(dataType);

        // 如果已经是字节数组
        if (value instanceof Uint8Array) {
            return value;
        }

        // 浮点数处理
        if (typeInfo.float) {
            const buffer = new ArrayBuffer(typeInfo.bytes);
            const view = new DataView(buffer);
            if (typeInfo.bytes === 4) {
                view.setFloat32(0, value, false); // BE
            } else {
                view.setFloat64(0, value, false); // BE
            }
            return new Uint8Array(buffer);
        }

        // 整数处理
        const bytes = new Uint8Array(typeInfo.bytes);
        let val = BigInt(value);

        // 处理负数
        if (val < 0 && typeInfo.signed) {
            val = (1n << BigInt(typeInfo.bytes * 8)) + val;
        }

        for (let i = typeInfo.bytes - 1; i >= 0; i--) {
            bytes[i] = Number(val & 0xFFn);
            val >>= 8n;
        }

        return bytes;
    }

    /**
     * 反转字节数组 (BE <-> LE)
     */
    function reverseBytes(bytes) {
        return new Uint8Array([...bytes].reverse());
    }

    /**
     * 字节数组转十六进制字符串
     */
    function bytesToHex(bytes, separator = '') {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(separator);
    }

    /**
     * 十六进制字符串转字节数组
     */
    function hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    /**
     * 从字节数组解析数值 (大端序)
     */
    function bytesToValueBE(bytes, dataType) {
        const typeInfo = getDataTypeInfo(dataType);

        if (dataType === 'hex') {
            return bytesToHex(bytes);
        }

        const buffer = new ArrayBuffer(bytes.length);
        const view = new DataView(buffer);
        bytes.forEach((b, i) => view.setUint8(i, b));

        if (typeInfo.float) {
            if (typeInfo.bytes === 4) {
                return view.getFloat32(0, false);
            } else {
                return view.getFloat64(0, false);
            }
        }

        let value = 0n;
        for (let i = 0; i < bytes.length; i++) {
            value = (value << 8n) | BigInt(bytes[i]);
        }

        // 处理有符号数
        if (typeInfo.signed) {
            const maxPositive = (1n << BigInt(typeInfo.bytes * 8 - 1)) - 1n;
            if (value > maxPositive) {
                value = value - (1n << BigInt(typeInfo.bytes * 8));
            }
        }

        return value;
    }

    /**
     * 从字节数组解析数值 (小端序)
     */
    function bytesToValueLE(bytes, dataType) {
        return bytesToValueBE(reverseBytes(bytes), dataType);
    }

    /**
     * 渲染字节可视化
     */
    function renderByteVisualization(bytesBE) {
        const container = document.getElementById('byte-container');
        if (!container) return;

        let html = '<div class="byte-row"><span style="font-size: 0.75rem; color: var(--text-muted);">BE:</span>';
        bytesBE.forEach((b, i) => {
            html += `
                <div class="byte-item highlight-be">
                    <span class="byte-index">[${i}]</span>
                    <span class="byte-hex">${b.toString(16).padStart(2, '0').toUpperCase()}</span>
                    <span class="byte-binary">${b.toString(2).padStart(8, '0')}</span>
                </div>
            `;
        });
        html += '</div>';

        const bytesLE = reverseBytes(bytesBE);
        html += '<div class="byte-row" style="margin-top: 0.5rem;"><span style="font-size: 0.75rem; color: var(--text-muted);">LE:</span>';
        bytesLE.forEach((b, i) => {
            html += `
                <div class="byte-item highlight-le">
                    <span class="byte-index">[${i}]</span>
                    <span class="byte-hex">${b.toString(16).padStart(2, '0').toUpperCase()}</span>
                    <span class="byte-binary">${b.toString(2).padStart(8, '0')}</span>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    /**
     * 格式化数值显示
     */
    function formatValue(value, dataType) {
        const typeInfo = getDataTypeInfo(dataType);

        if (dataType === 'hex') {
            return value;
        }

        if (typeInfo.float) {
            return value.toString();
        }

        return value.toString();
    }

    /**
     * 执行转换
     */
    function convert() {
        const inputEl = document.getElementById('input');
        const dataType = document.getElementById('data-type')?.value || 'int32';
        const inputFormat = document.getElementById('input-format')?.value || 'decimal';

        const resultSection = document.getElementById('result-section');
        const beHex = document.getElementById('be-hex');
        const beBytes = document.getElementById('be-bytes');
        const beDecimal = document.getElementById('be-decimal');
        const leHex = document.getElementById('le-hex');
        const leBytes = document.getElementById('le-bytes');
        const leDecimal = document.getElementById('le-decimal');

        if (!inputEl?.value.trim()) {
            throw new Error('请输入数值');
        }

        // 解析输入
        const value = parseInputValue(inputEl.value, inputFormat, dataType);

        // 转换为大端序字节
        const bytesBE = valueToBytesBE(value, dataType);
        const bytesLE = reverseBytes(bytesBE);

        // 解析数值
        const valueBE = bytesToValueBE(bytesBE, dataType);
        const valueLE = bytesToValueLE(bytesBE, dataType);

        // 显示结果
        if (resultSection) resultSection.style.display = 'block';

        if (beHex) beHex.textContent = '0x' + bytesToHex(bytesBE);
        if (beBytes) beBytes.textContent = bytesToHex(bytesBE, ' ');
        if (beDecimal) beDecimal.textContent = formatValue(valueBE, dataType);

        if (leHex) leHex.textContent = '0x' + bytesToHex(bytesLE);
        if (leBytes) leBytes.textContent = bytesToHex(bytesLE, ' ');
        if (leDecimal) leDecimal.textContent = formatValue(valueLE, dataType);

        // 渲染字节可视化
        renderByteVisualization(bytesBE);
    }

    /**
     * 交换字节序 (将当前输入的字节序反转后重新设置为输入)
     */
    function swapEndian() {
        const inputEl = document.getElementById('input');
        const dataType = document.getElementById('data-type')?.value || 'int32';
        const inputFormat = document.getElementById('input-format')?.value || 'decimal';

        if (!inputEl?.value.trim()) {
            REOT.utils?.showNotification('请先输入数值', 'warning');
            return;
        }

        try {
            const value = parseInputValue(inputEl.value, inputFormat, dataType);
            const bytesBE = valueToBytesBE(value, dataType);
            const bytesLE = reverseBytes(bytesBE);

            // 将小端序的值作为新的大端序输入
            const newValue = bytesToValueBE(bytesLE, dataType);

            if (inputFormat === 'hex') {
                inputEl.value = '0x' + bytesToHex(bytesLE);
            } else if (inputFormat === 'binary') {
                inputEl.value = '0b' + BigInt(newValue).toString(2);
            } else {
                inputEl.value = formatValue(newValue, dataType);
            }

            convert();
        } catch (error) {
            REOT.utils?.showNotification(error.message, 'error');
        }
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isByteOrderToolActive()) return;

        const target = e.target;

        // 转换按钮
        if (target.id === 'convert-btn' || target.closest('#convert-btn')) {
            try {
                convert();
                REOT.utils?.showNotification('转换成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 交换字节序按钮
        if (target.id === 'swap-btn' || target.closest('#swap-btn')) {
            swapEndian();
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const inputEl = document.getElementById('input');
            const resultSection = document.getElementById('result-section');
            if (inputEl) inputEl.value = '';
            if (resultSection) resultSection.style.display = 'none';
        }

        // 复制按钮
        if (target.classList.contains('copy-btn') || target.closest('.copy-btn')) {
            const btn = target.classList.contains('copy-btn') ? target : target.closest('.copy-btn');
            const targetId = btn.dataset.target;
            const targetEl = document.getElementById(targetId);

            if (targetEl?.textContent) {
                const success = await REOT.utils?.copyToClipboard(targetEl.textContent);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }
    });

    // 输入变化时自动转换
    document.addEventListener('input', (e) => {
        if (!isByteOrderToolActive()) return;

        if (e.target.id === 'input') {
            try {
                const resultSection = document.getElementById('result-section');
                if (e.target.value.trim() && resultSection?.style.display !== 'none') {
                    convert();
                }
            } catch (error) {
                // 忽略输入过程中的错误
            }
        }
    });

    // 数据类型或格式变化时重新转换
    document.addEventListener('change', (e) => {
        if (!isByteOrderToolActive()) return;

        if (e.target.id === 'data-type' || e.target.id === 'input-format') {
            const inputEl = document.getElementById('input');
            const resultSection = document.getElementById('result-section');
            if (inputEl?.value.trim() && resultSection?.style.display !== 'none') {
                try {
                    convert();
                } catch (error) {
                    // 忽略
                }
            }
        }
    });

    // 初始化
    function init() {
        const inputEl = document.getElementById('input');
        if (inputEl && !inputEl.value) {
            inputEl.value = '305419896'; // 0x12345678
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出工具函数
    window.ByteOrderTool = { convert, swapEndian, valueToBytesBE, reverseBytes };

})();
