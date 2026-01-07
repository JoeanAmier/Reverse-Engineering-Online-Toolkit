/**
 * 时间单位转换工具
 * @description 秒、分钟、小时、天等单位转换
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // 单位定义（以毫秒为基准）
    const UNITS = {
        'ms': 1,
        's': 1000,
        'min': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'mo': 30 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000
    };

    // DOM 元素
    const inputValue = document.getElementById('input-value');
    const inputUnit = document.getElementById('input-unit');
    const humanReadable = document.getElementById('human-readable');

    /**
     * 转换为毫秒
     */
    function toMilliseconds(value, unit) {
        return value * UNITS[unit];
    }

    /**
     * 从毫秒转换
     */
    function fromMilliseconds(ms, unit) {
        return ms / UNITS[unit];
    }

    /**
     * 格式化数字
     */
    function formatNumber(num) {
        if (num === 0) return '0';
        if (Math.abs(num) < 0.0001) return num.toExponential(4);
        if (Math.abs(num) >= 1e12) return num.toExponential(4);

        if (Number.isInteger(num)) return num.toLocaleString();
        return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }

    /**
     * 生成人类可读格式
     */
    function toHumanReadable(ms) {
        if (ms === 0) return '0 毫秒';

        const parts = [];
        let remaining = Math.abs(ms);

        const units = [
            { name: '年', ms: UNITS.y },
            { name: '天', ms: UNITS.d },
            { name: '小时', ms: UNITS.h },
            { name: '分钟', ms: UNITS.min },
            { name: '秒', ms: UNITS.s },
            { name: '毫秒', ms: 1 }
        ];

        for (const unit of units) {
            if (remaining >= unit.ms) {
                const count = Math.floor(remaining / unit.ms);
                remaining %= unit.ms;
                parts.push(`${count} ${unit.name}`);
            }
        }

        return (ms < 0 ? '-' : '') + parts.join(' ');
    }

    /**
     * 更新所有结果
     */
    function updateResults() {
        const value = parseFloat(inputValue.value);
        const unit = inputUnit.value;

        if (isNaN(value)) {
            Object.keys(UNITS).forEach(u => {
                const el = document.getElementById(`result-${u}`);
                if (el) el.value = '';
            });
            humanReadable.textContent = '';
            return;
        }

        const ms = toMilliseconds(value, unit);

        // 更新所有单位
        document.getElementById('result-ms').value = formatNumber(ms);
        document.getElementById('result-s').value = formatNumber(fromMilliseconds(ms, 's'));
        document.getElementById('result-min').value = formatNumber(fromMilliseconds(ms, 'min'));
        document.getElementById('result-h').value = formatNumber(fromMilliseconds(ms, 'h'));
        document.getElementById('result-d').value = formatNumber(fromMilliseconds(ms, 'd'));
        document.getElementById('result-w').value = formatNumber(fromMilliseconds(ms, 'w'));
        document.getElementById('result-mo').value = formatNumber(fromMilliseconds(ms, 'mo'));
        document.getElementById('result-y').value = formatNumber(fromMilliseconds(ms, 'y'));

        // 人类可读格式
        humanReadable.textContent = '≈ ' + toHumanReadable(ms);
    }

    // 事件监听
    inputValue.addEventListener('input', updateResults);
    inputUnit.addEventListener('change', updateResults);

    // 设置默认值
    if (!inputValue.value) {
        inputValue.value = '3600';
        updateResults();
    }

    // 导出到全局
    window.TimeUnitTool = { toMilliseconds, fromMilliseconds, toHumanReadable };
})();
