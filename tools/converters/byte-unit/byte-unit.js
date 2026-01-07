/**
 * 字节单位转换工具
 * @description B, KB, MB, GB, TB 等单位转换
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // 单位定义
    const UNITS = {
        // 十进制 (SI)
        'B': 1,
        'KB': 1000,
        'MB': 1000 ** 2,
        'GB': 1000 ** 3,
        'TB': 1000 ** 4,
        'PB': 1000 ** 5,
        // 二进制 (IEC)
        'KiB': 1024,
        'MiB': 1024 ** 2,
        'GiB': 1024 ** 3,
        'TiB': 1024 ** 4,
        'PiB': 1024 ** 5
    };

    // DOM 元素
    const inputValue = document.getElementById('input-value');
    const inputUnit = document.getElementById('input-unit');

    /**
     * 转换为字节
     */
    function toBytes(value, unit) {
        return value * UNITS[unit];
    }

    /**
     * 从字节转换
     */
    function fromBytes(bytes, unit) {
        return bytes / UNITS[unit];
    }

    /**
     * 格式化数字
     */
    function formatNumber(num) {
        if (num === 0) return '0';
        if (Math.abs(num) < 0.0001) return num.toExponential(4);
        if (Math.abs(num) >= 1e15) return num.toExponential(4);

        // 保留合适的小数位
        if (Number.isInteger(num)) return num.toLocaleString();
        return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    }

    /**
     * 更新所有结果
     */
    function updateResults() {
        const value = parseFloat(inputValue.value);
        const unit = inputUnit.value;

        if (isNaN(value)) {
            Object.keys(UNITS).forEach(u => {
                const el = document.getElementById(`result-${u.toLowerCase()}`);
                if (el) el.value = '';
            });
            return;
        }

        const bytes = toBytes(value, unit);

        // 更新十进制单位
        document.getElementById('result-b').value = formatNumber(bytes);
        document.getElementById('result-kb').value = formatNumber(fromBytes(bytes, 'KB'));
        document.getElementById('result-mb').value = formatNumber(fromBytes(bytes, 'MB'));
        document.getElementById('result-gb').value = formatNumber(fromBytes(bytes, 'GB'));
        document.getElementById('result-tb').value = formatNumber(fromBytes(bytes, 'TB'));
        document.getElementById('result-pb').value = formatNumber(fromBytes(bytes, 'PB'));

        // 更新二进制单位
        document.getElementById('result-kib').value = formatNumber(fromBytes(bytes, 'KiB'));
        document.getElementById('result-mib').value = formatNumber(fromBytes(bytes, 'MiB'));
        document.getElementById('result-gib').value = formatNumber(fromBytes(bytes, 'GiB'));
        document.getElementById('result-tib').value = formatNumber(fromBytes(bytes, 'TiB'));
    }

    // 事件监听
    inputValue.addEventListener('input', updateResults);
    inputUnit.addEventListener('change', updateResults);

    // 设置默认值
    if (!inputValue.value) {
        inputValue.value = '1';
        updateResults();
    }

    // 导出到全局
    window.ByteUnitTool = { toBytes, fromBytes };
})();
