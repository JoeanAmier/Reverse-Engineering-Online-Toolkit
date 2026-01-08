/**
 * IEEE 754 浮点数工具
 * @description 查看浮点数的 IEEE 754 二进制表示
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * 检查当前是否在 IEEE 754 工具页面
     */
    function isIEEE754ToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/converters/ieee754');
    }

    /**
     * 获取精度配置
     */
    function getPrecisionConfig(precision) {
        const configs = {
            'float32': {
                totalBits: 32,
                exponentBits: 8,
                mantissaBits: 23,
                bias: 127
            },
            'float64': {
                totalBits: 64,
                exponentBits: 11,
                mantissaBits: 52,
                bias: 1023
            }
        };
        return configs[precision] || configs['float32'];
    }

    /**
     * 将浮点数转换为 IEEE 754 位数组
     */
    function floatToBits(value, precision) {
        const config = getPrecisionConfig(precision);
        const buffer = new ArrayBuffer(config.totalBits / 8);
        const view = new DataView(buffer);

        if (precision === 'float32') {
            view.setFloat32(0, value, false); // Big endian
        } else {
            view.setFloat64(0, value, false); // Big endian
        }

        const bits = [];
        for (let i = 0; i < config.totalBits / 8; i++) {
            const byte = view.getUint8(i);
            for (let j = 7; j >= 0; j--) {
                bits.push((byte >> j) & 1);
            }
        }

        return bits;
    }

    /**
     * 从 IEEE 754 位数组转换为浮点数
     */
    function bitsToFloat(bits, precision) {
        const config = getPrecisionConfig(precision);
        const buffer = new ArrayBuffer(config.totalBits / 8);
        const view = new DataView(buffer);

        for (let i = 0; i < config.totalBits / 8; i++) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                byte = (byte << 1) | bits[i * 8 + j];
            }
            view.setUint8(i, byte);
        }

        if (precision === 'float32') {
            return view.getFloat32(0, false);
        } else {
            return view.getFloat64(0, false);
        }
    }

    /**
     * 从十六进制字符串转换为浮点数
     */
    function hexToFloat(hex, precision) {
        const config = getPrecisionConfig(precision);
        hex = hex.replace(/\s/g, '').replace(/^0x/i, '');

        const expectedLength = config.totalBits / 4;
        if (hex.length !== expectedLength) {
            throw new Error(`${precision} 需要 ${expectedLength} 个十六进制字符`);
        }

        const buffer = new ArrayBuffer(config.totalBits / 8);
        const view = new DataView(buffer);

        for (let i = 0; i < hex.length / 2; i++) {
            view.setUint8(i, parseInt(hex.substr(i * 2, 2), 16));
        }

        if (precision === 'float32') {
            return view.getFloat32(0, false);
        } else {
            return view.getFloat64(0, false);
        }
    }

    /**
     * 从二进制字符串转换为浮点数
     */
    function binaryToFloat(binary, precision) {
        const config = getPrecisionConfig(precision);
        binary = binary.replace(/\s/g, '');

        if (binary.length !== config.totalBits) {
            throw new Error(`${precision} 需要 ${config.totalBits} 个二进制位`);
        }

        const bits = binary.split('').map(b => parseInt(b, 10));
        return bitsToFloat(bits, precision);
    }

    /**
     * 将浮点数转换为十六进制字符串
     */
    function floatToHex(value, precision) {
        const config = getPrecisionConfig(precision);
        const buffer = new ArrayBuffer(config.totalBits / 8);
        const view = new DataView(buffer);

        if (precision === 'float32') {
            view.setFloat32(0, value, false);
        } else {
            view.setFloat64(0, value, false);
        }

        let hex = '';
        for (let i = 0; i < config.totalBits / 8; i++) {
            hex += view.getUint8(i).toString(16).padStart(2, '0').toUpperCase();
        }
        return '0x' + hex;
    }

    /**
     * 分析 IEEE 754 表示
     */
    function analyzeIEEE754(value, precision) {
        const config = getPrecisionConfig(precision);
        const bits = floatToBits(value, precision);

        // 提取各部分
        const signBit = bits[0];
        const exponentBits = bits.slice(1, 1 + config.exponentBits);
        const mantissaBits = bits.slice(1 + config.exponentBits);

        // 计算指数值
        const exponentValue = parseInt(exponentBits.join(''), 2);

        // 计算尾数值
        let mantissaValue = 0;
        for (let i = 0; i < mantissaBits.length; i++) {
            mantissaValue += mantissaBits[i] * Math.pow(2, -(i + 1));
        }

        // 检测特殊值
        let specialValue = null;
        const allExponentOnes = exponentValue === Math.pow(2, config.exponentBits) - 1;
        const allMantissaZeros = mantissaBits.every(b => b === 0);

        if (allExponentOnes && allMantissaZeros) {
            specialValue = signBit ? '-Infinity' : '+Infinity';
        } else if (allExponentOnes && !allMantissaZeros) {
            specialValue = 'NaN (Not a Number)';
        } else if (exponentValue === 0 && allMantissaZeros) {
            specialValue = signBit ? '-0' : '+0';
        } else if (exponentValue === 0) {
            specialValue = '非规格化数 (Denormalized)';
        }

        // 计算实际指数
        let actualExponent;
        let formula;

        if (exponentValue === 0) {
            // 非规格化数
            actualExponent = 1 - config.bias;
            formula = `(-1)^${signBit} × 0.${mantissaBits.join('')}₂ × 2^${actualExponent}`;
        } else if (!allExponentOnes) {
            // 规格化数
            actualExponent = exponentValue - config.bias;
            formula = `(-1)^${signBit} × 1.${mantissaBits.join('').substring(0, 10)}...₂ × 2^${actualExponent}`;
        } else {
            formula = specialValue;
        }

        return {
            bits,
            signBit,
            exponentBits,
            mantissaBits,
            exponentValue,
            mantissaValue,
            actualExponent,
            bias: config.bias,
            specialValue,
            formula
        };
    }

    /**
     * 渲染位图可视化
     */
    function renderBitsVisualization(analysis, precision) {
        const container = document.getElementById('bits-container');
        if (!container) return;

        const config = getPrecisionConfig(precision);
        let html = '';

        // 符号位
        html += `
            <div class="bit-cell sign">
                <span class="bit-index">${config.totalBits - 1}</span>
                <span class="bit-value">${analysis.signBit}</span>
            </div>
        `;

        // 指数位
        for (let i = 0; i < analysis.exponentBits.length; i++) {
            html += `
                <div class="bit-cell exponent">
                    <span class="bit-index">${config.totalBits - 2 - i}</span>
                    <span class="bit-value">${analysis.exponentBits[i]}</span>
                </div>
            `;
        }

        // 尾数位
        for (let i = 0; i < analysis.mantissaBits.length; i++) {
            html += `
                <div class="bit-cell mantissa">
                    <span class="bit-index">${config.mantissaBits - 1 - i}</span>
                    <span class="bit-value">${analysis.mantissaBits[i]}</span>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    /**
     * 执行转换
     */
    function convert() {
        const inputEl = document.getElementById('input');
        const precision = document.getElementById('precision')?.value || 'float32';
        const inputMode = document.getElementById('input-mode')?.value || 'decimal';

        const resultSection = document.getElementById('result-section');
        const decimalValueEl = document.getElementById('decimal-value');
        const hexValueEl = document.getElementById('hex-value');
        const signValueEl = document.getElementById('sign-value');
        const signDescEl = document.getElementById('sign-desc');
        const exponentValueEl = document.getElementById('exponent-value');
        const exponentDescEl = document.getElementById('exponent-desc');
        const mantissaValueEl = document.getElementById('mantissa-value');
        const mantissaDescEl = document.getElementById('mantissa-desc');
        const formulaEl = document.getElementById('formula');
        const specialValueEl = document.getElementById('special-value');
        const specialTextEl = document.getElementById('special-text');

        if (!inputEl?.value.trim()) {
            throw new Error('请输入数值');
        }

        let value;
        const input = inputEl.value.trim();

        // 根据输入模式解析
        switch (inputMode) {
            case 'hex':
                value = hexToFloat(input, precision);
                break;
            case 'binary':
                value = binaryToFloat(input, precision);
                break;
            default: // decimal
                value = parseFloat(input);
                if (isNaN(value) && input.toLowerCase() !== 'nan') {
                    throw new Error('无效的数值');
                }
                // Handle special inputs
                if (input.toLowerCase() === 'infinity' || input === '+Infinity') {
                    value = Infinity;
                } else if (input.toLowerCase() === '-infinity') {
                    value = -Infinity;
                } else if (input.toLowerCase() === 'nan') {
                    value = NaN;
                }
        }

        // 分析 IEEE 754 表示
        const analysis = analyzeIEEE754(value, precision);

        // 显示结果
        if (resultSection) resultSection.style.display = 'block';

        // 数值显示
        if (decimalValueEl) decimalValueEl.textContent = Object.is(value, -0) ? '-0' : value.toString();
        if (hexValueEl) hexValueEl.textContent = floatToHex(value, precision);

        // 符号位
        if (signValueEl) signValueEl.textContent = analysis.signBit.toString();
        if (signDescEl) signDescEl.textContent = analysis.signBit === 0 ? '正数 (+)' : '负数 (-)';

        // 指数
        if (exponentValueEl) exponentValueEl.textContent = `${analysis.exponentBits.join('')}₂ = ${analysis.exponentValue}`;
        if (exponentDescEl) {
            if (analysis.actualExponent !== undefined) {
                exponentDescEl.textContent = `实际指数: ${analysis.exponentValue} - ${analysis.bias} = ${analysis.actualExponent}`;
            } else {
                exponentDescEl.textContent = '特殊值';
            }
        }

        // 尾数
        if (mantissaValueEl) {
            const mantissaStr = analysis.mantissaBits.join('');
            mantissaValueEl.textContent = mantissaStr.length > 20
                ? mantissaStr.substring(0, 20) + '...'
                : mantissaStr;
        }
        if (mantissaDescEl) {
            mantissaDescEl.textContent = `有效值: ${(1 + analysis.mantissaValue).toFixed(10)}`;
        }

        // 公式
        if (formulaEl) formulaEl.textContent = analysis.formula;

        // 特殊值提示
        if (specialValueEl && specialTextEl) {
            if (analysis.specialValue) {
                specialValueEl.style.display = 'flex';
                specialTextEl.textContent = analysis.specialValue;
            } else {
                specialValueEl.style.display = 'none';
            }
        }

        // 渲染位图
        renderBitsVisualization(analysis, precision);
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isIEEE754ToolActive()) return;

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
        if (!isIEEE754ToolActive()) return;

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

    // 精度或输入模式变化时重新转换
    document.addEventListener('change', (e) => {
        if (!isIEEE754ToolActive()) return;

        if (e.target.id === 'precision' || e.target.id === 'input-mode') {
            const inputEl = document.getElementById('input');
            const resultSection = document.getElementById('result-section');

            // 更新 placeholder
            if (e.target.id === 'input-mode') {
                const placeholders = {
                    'decimal': '请输入浮点数，如 3.14, -2.5, Infinity, NaN...',
                    'hex': '请输入十六进制，如 40490FDB (float32) 或 400921FB54442D18 (float64)',
                    'binary': '请输入二进制位...'
                };
                if (inputEl) {
                    inputEl.placeholder = placeholders[e.target.value] || placeholders['decimal'];
                }
            }

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
            inputEl.value = '3.14159265358979';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出工具函数
    window.IEEE754Tool = { convert, floatToBits, bitsToFloat, floatToHex, hexToFloat, analyzeIEEE754 };

})();
