/**
 * IP 地址转换工具
 * @description IP 地址与整数互转
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const dottedEl = document.getElementById('ipv4-dotted');
    const decimalEl = document.getElementById('ipv4-decimal');
    const hexEl = document.getElementById('ipv4-hex');
    const binaryEl = document.getElementById('ipv4-binary');
    const ipClassEl = document.getElementById('ip-class');
    const ipTypeEl = document.getElementById('ip-type');
    const clearBtn = document.getElementById('clear-btn');

    /**
     * 点分十进制转整数
     */
    function dottedToDecimal(ip) {
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
            throw new Error('无效的 IP 地址');
        }
        return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    }

    /**
     * 整数转点分十进制
     */
    function decimalToDotted(num) {
        return [
            (num >>> 24) & 255,
            (num >>> 16) & 255,
            (num >>> 8) & 255,
            num & 255
        ].join('.');
    }

    /**
     * 整数转十六进制
     */
    function decimalToHex(num) {
        return num.toString(16).toUpperCase().padStart(8, '0');
    }

    /**
     * 十六进制转整数
     */
    function hexToDecimal(hex) {
        hex = hex.replace(/^0x/i, '');
        const num = parseInt(hex, 16);
        if (isNaN(num) || num < 0 || num > 0xFFFFFFFF) {
            throw new Error('无效的十六进制');
        }
        return num;
    }

    /**
     * 整数转二进制（点分格式）
     */
    function decimalToBinary(num) {
        return [
            ((num >>> 24) & 255).toString(2).padStart(8, '0'),
            ((num >>> 16) & 255).toString(2).padStart(8, '0'),
            ((num >>> 8) & 255).toString(2).padStart(8, '0'),
            (num & 255).toString(2).padStart(8, '0')
        ].join('.');
    }

    /**
     * 二进制转整数
     */
    function binaryToDecimal(binary) {
        const parts = binary.split('.').map(b => parseInt(b, 2));
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
            throw new Error('无效的二进制');
        }
        return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    }

    /**
     * 获取 IP 类别
     */
    function getIPClass(num) {
        const firstOctet = (num >>> 24) & 255;
        if (firstOctet < 128) return 'A 类';
        if (firstOctet < 192) return 'B 类';
        if (firstOctet < 224) return 'C 类';
        if (firstOctet < 240) return 'D 类 (多播)';
        return 'E 类 (保留)';
    }

    /**
     * 获取 IP 类型
     */
    function getIPType(num) {
        const firstOctet = (num >>> 24) & 255;
        const secondOctet = (num >>> 16) & 255;

        // 私有地址
        if (firstOctet === 10) return '私有地址 (A 类)';
        if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) return '私有地址 (B 类)';
        if (firstOctet === 192 && secondOctet === 168) return '私有地址 (C 类)';

        // 回环地址
        if (firstOctet === 127) return '回环地址';

        // 链路本地
        if (firstOctet === 169 && secondOctet === 254) return '链路本地地址';

        // 广播
        if (num === 0xFFFFFFFF) return '广播地址';

        return '公网地址';
    }

    /**
     * 更新所有字段
     */
    function updateAll(decimal, source) {
        if (source !== dottedEl) dottedEl.value = decimalToDotted(decimal);
        if (source !== decimalEl) decimalEl.value = decimal.toString();
        if (source !== hexEl) hexEl.value = decimalToHex(decimal);
        if (source !== binaryEl) binaryEl.value = decimalToBinary(decimal);

        ipClassEl.textContent = getIPClass(decimal);
        ipTypeEl.textContent = getIPType(decimal);
    }

    // 事件监听
    dottedEl.addEventListener('input', () => {
        try {
            const decimal = dottedToDecimal(dottedEl.value);
            updateAll(decimal, dottedEl);
        } catch (e) {}
    });

    decimalEl.addEventListener('input', () => {
        try {
            const decimal = parseInt(decimalEl.value);
            if (!isNaN(decimal) && decimal >= 0 && decimal <= 0xFFFFFFFF) {
                updateAll(decimal, decimalEl);
            }
        } catch (e) {}
    });

    hexEl.addEventListener('input', () => {
        try {
            const decimal = hexToDecimal(hexEl.value);
            updateAll(decimal, hexEl);
        } catch (e) {}
    });

    binaryEl.addEventListener('input', () => {
        try {
            const decimal = binaryToDecimal(binaryEl.value);
            updateAll(decimal, binaryEl);
        } catch (e) {}
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            dottedEl.value = '';
            decimalEl.value = '';
            hexEl.value = '';
            binaryEl.value = '';
            ipClassEl.textContent = '-';
            ipTypeEl.textContent = '-';
        });
    }

    // 设置默认示例
    if (!dottedEl.value) {
        dottedEl.value = '192.168.1.1';
        const decimal = dottedToDecimal(dottedEl.value);
        updateAll(decimal, dottedEl);
    }

    // 导出到全局
    window.IPConverterTool = { dottedToDecimal, decimalToDotted };
})();
