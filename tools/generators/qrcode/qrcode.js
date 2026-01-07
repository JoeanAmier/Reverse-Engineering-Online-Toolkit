/**
 * 条码生成器
 * @description 生成QR码和各种条形码
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * 动态加载脚本
     */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 初始化工具
     */
    async function init() {
        // 加载依赖库
        try {
            await loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js');
            await loadScript('https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js');
        } catch (e) {
            console.error('加载依赖库失败:', e);
            alert('加载依赖库失败，请检查网络连接');
            return;
        }

        // 当前类型
        let currentType = 'qrcode';

        // DOM 元素
        const typeTabs = document.querySelectorAll('.type-tab');
        const inputText = document.getElementById('input-text');
        const qrcodeOptions = document.getElementById('qrcode-options');
        const barcodeOptions = document.getElementById('barcode-options');
        const generateBtn = document.getElementById('generate-btn');
        const downloadBtn = document.getElementById('download-btn');
        const downloadSvgBtn = document.getElementById('download-svg-btn');
        const resultSection = document.getElementById('result-section');
        const codePreview = document.getElementById('code-preview');
        const formatInfo = document.getElementById('format-info');

        // QR码选项
        const qrErrorLevel = document.getElementById('qr-error-level');
        const qrSize = document.getElementById('qr-size');
        const qrFgColor = document.getElementById('qr-fg-color');
        const qrBgColor = document.getElementById('qr-bg-color');

        // 条形码选项
        const barcodeFormat = document.getElementById('barcode-format');
        const barcodeWidth = document.getElementById('barcode-width');
        const barcodeHeight = document.getElementById('barcode-height');
        const barcodeShowText = document.getElementById('barcode-show-text');

        // 条形码格式信息
        const BARCODE_INFO = {
            'CODE128': { name: 'CODE 128', desc: '通用条形码，支持ASCII字符', example: 'ABC-123' },
            'CODE39': { name: 'CODE 39', desc: '支持数字、大写字母和特殊字符', example: 'CODE39' },
            'CODE93': { name: 'CODE 93', desc: 'CODE 39的改进版，更紧凑', example: 'CODE93' },
            'EAN13': { name: 'EAN-13', desc: '国际商品条码，13位数字', example: '5901234123457', validate: /^\d{12,13}$/ },
            'EAN8': { name: 'EAN-8', desc: '短版商品条码，8位数字', example: '96385074', validate: /^\d{7,8}$/ },
            'UPC': { name: 'UPC-A', desc: '美国商品条码，12位数字', example: '123456789012', validate: /^\d{11,12}$/ },
            'UPCE': { name: 'UPC-E', desc: '压缩版UPC，8位数字', example: '01234565', validate: /^\d{6,8}$/ },
            'ITF14': { name: 'ITF-14', desc: '物流条码，14位数字', example: '10012345678902', validate: /^\d{14}$/ },
            'ITF': { name: 'ITF', desc: '交叉25码，偶数位数字', example: '123456', validate: /^\d+$/ },
            'pharmacode': { name: 'Pharmacode', desc: '药品条码，数字3-131070', example: '1234', validate: /^\d+$/ },
            'MSI': { name: 'MSI', desc: '库存管理条码', example: '1234567' },
            'codabar': { name: 'Codabar', desc: '图书馆/血库常用', example: 'A12345B' }
        };

        /**
         * 切换类型
         */
        function switchType(type) {
            currentType = type;

            // 更新标签状态
            typeTabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.type === type);
            });

            // 切换选项面板
            qrcodeOptions.style.display = type === 'qrcode' ? 'grid' : 'none';
            barcodeOptions.style.display = type === 'barcode' ? 'grid' : 'none';

            // 更新占位符
            if (type === 'qrcode') {
                inputText.placeholder = '输入要编码的文本或URL...';
            } else {
                const format = barcodeFormat.value;
                const info = BARCODE_INFO[format];
                inputText.placeholder = `示例: ${info.example}`;
            }

            // 隐藏SVG下载按钮（条形码支持SVG，QR码也支持）
            downloadSvgBtn.style.display = 'inline-block';

            // 清除预览
            resultSection.style.display = 'none';
            downloadBtn.disabled = true;
            downloadSvgBtn.disabled = true;
        }

        /**
         * 生成QR码
         */
        function generateQRCode(text) {
            const errorLevel = qrErrorLevel.value;
            const size = parseInt(qrSize.value);
            const fgColor = qrFgColor.value;
            const bgColor = qrBgColor.value;

            // 使用 qrcode-generator 库
            const typeNumber = 0; // 自动选择版本
            const errorCorrectionLevel = errorLevel;

            const qr = qrcode(typeNumber, errorCorrectionLevel);
            qr.addData(text);
            qr.make();

            // 创建Canvas
            const moduleCount = qr.getModuleCount();
            const cellSize = Math.floor(size / (moduleCount + 8)); // +8 为静默区
            const actualSize = cellSize * (moduleCount + 8);

            const canvas = document.createElement('canvas');
            canvas.width = actualSize;
            canvas.height = actualSize;
            const ctx = canvas.getContext('2d');

            // 填充背景
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, actualSize, actualSize);

            // 绘制QR码
            ctx.fillStyle = fgColor;
            const offset = cellSize * 4; // 静默区偏移
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(
                            offset + col * cellSize,
                            offset + row * cellSize,
                            cellSize,
                            cellSize
                        );
                    }
                }
            }

            // 清空预览区并添加Canvas
            codePreview.innerHTML = '';
            codePreview.appendChild(canvas);

            // 计算版本号 (版本 = (模块数 - 21) / 4 + 1)
            const version = Math.floor((moduleCount - 21) / 4) + 1;

            // 显示格式信息
            formatInfo.innerHTML = `
                <p><strong>类型:</strong> QR码</p>
                <p><strong>纠错级别:</strong> ${errorLevel} (${{'L':'7%','M':'15%','Q':'25%','H':'30%'}[errorLevel]})</p>
                <p><strong>版本:</strong> ${version}</p>
                <p><strong>模块数:</strong> ${moduleCount} x ${moduleCount}</p>
            `;

            return canvas;
        }

        /**
         * 生成条形码
         */
        function generateBarcode(text) {
            const format = barcodeFormat.value;
            const width = parseInt(barcodeWidth.value);
            const height = parseInt(barcodeHeight.value);
            const showText = barcodeShowText.checked;
            const info = BARCODE_INFO[format];

            // 验证输入
            if (info.validate && !info.validate.test(text)) {
                throw new Error(`${info.name} 格式要求: ${info.desc}\n示例: ${info.example}`);
            }

            // 创建SVG元素
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

            try {
                JsBarcode(svg, text, {
                    format: format,
                    width: width,
                    height: height,
                    displayValue: showText,
                    fontSize: 14,
                    margin: 10,
                    background: '#ffffff',
                    lineColor: '#000000'
                });
            } catch (e) {
                throw new Error(`生成失败: ${e.message}\n${info.name} 示例: ${info.example}`);
            }

            // 清空预览区并添加SVG
            codePreview.innerHTML = '';
            codePreview.appendChild(svg);

            // 显示格式信息
            formatInfo.innerHTML = `
                <p><strong>类型:</strong> ${info.name}</p>
                <p><strong>描述:</strong> ${info.desc}</p>
                <p><strong>数据:</strong> ${text}</p>
            `;

            return svg;
        }

        /**
         * 生成条码
         */
        function generate() {
            const text = inputText.value.trim();
            if (!text) {
                alert('请输入要编码的内容');
                return;
            }

            try {
                if (currentType === 'qrcode') {
                    generateQRCode(text);
                } else {
                    generateBarcode(text);
                }

                resultSection.style.display = 'block';
                downloadBtn.disabled = false;
                downloadSvgBtn.disabled = false;
            } catch (e) {
                alert(e.message);
                console.error(e);
            }
        }

        /**
         * 下载PNG
         */
        function downloadPNG() {
            let canvas;

            if (currentType === 'qrcode') {
                canvas = codePreview.querySelector('canvas');
            } else {
                // 将SVG转换为Canvas
                const svg = codePreview.querySelector('svg');
                if (!svg) return;

                const svgData = new XMLSerializer().serializeToString(svg);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = function() {
                    canvas = document.createElement('canvas');
                    canvas.width = img.width * 2;
                    canvas.height = img.height * 2;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const link = document.createElement('a');
                    link.download = `${currentType === 'qrcode' ? 'qrcode' : 'barcode'}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();

                    URL.revokeObjectURL(url);
                };
                img.src = url;
                return;
            }

            if (canvas) {
                const link = document.createElement('a');
                link.download = 'qrcode.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }

        /**
         * 下载SVG
         */
        function downloadSVG() {
            let svgContent;

            if (currentType === 'qrcode') {
                // 将QR码Canvas转换为SVG
                const canvas = codePreview.querySelector('canvas');
                if (!canvas) return;

                const text = inputText.value.trim();
                const errorLevel = qrErrorLevel.value;

                const qr = qrcode(0, errorLevel);
                qr.addData(text);
                qr.make();

                const moduleCount = qr.getModuleCount();
                const cellSize = 10;
                const margin = 40;
                const size = moduleCount * cellSize + margin * 2;

                let paths = '';
                for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount; col++) {
                        if (qr.isDark(row, col)) {
                            paths += `M${margin + col * cellSize},${margin + row * cellSize}h${cellSize}v${cellSize}h-${cellSize}z`;
                        }
                    }
                }

                svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<rect width="100%" height="100%" fill="${qrBgColor.value}"/>
<path fill="${qrFgColor.value}" d="${paths}"/>
</svg>`;
            } else {
                const svg = codePreview.querySelector('svg');
                if (!svg) return;
                svgContent = new XMLSerializer().serializeToString(svg);
            }

            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.download = `${currentType === 'qrcode' ? 'qrcode' : 'barcode'}.svg`;
            link.href = url;
            link.click();

            URL.revokeObjectURL(url);
        }

        // 事件监听
        typeTabs.forEach(tab => {
            tab.addEventListener('click', () => switchType(tab.dataset.type));
        });

        generateBtn.addEventListener('click', generate);
        downloadBtn.addEventListener('click', downloadPNG);
        downloadSvgBtn.addEventListener('click', downloadSVG);

        // 条形码格式变化时更新占位符
        barcodeFormat.addEventListener('change', () => {
            const info = BARCODE_INFO[barcodeFormat.value];
            inputText.placeholder = `示例: ${info.example}`;
        });

        // 回车键生成
        inputText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                generate();
            }
        });

        // 默认示例
        if (!inputText.value) {
            inputText.value = 'https://github.com/Evil0ctal/Reverse-Engineering-Online-Toolkit';
            generate();
        }

        // 导出到全局
        window.CodeGeneratorTool = { generateQRCode, generateBarcode };
    }

    // 启动初始化
    init();
})();
