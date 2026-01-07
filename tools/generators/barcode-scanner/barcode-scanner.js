/**
 * 条码扫描器
 * @description 扫描QR码和各种条形码
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
     * 主初始化函数
     */
    async function main() {
        // 加载依赖库
        try {
            await loadScript('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js');
        } catch (e) {
            console.error('加载依赖库失败:', e);
            alert('加载扫描库失败，请检查网络连接');
            return;
        }

        // 当前模式
        let currentMode = 'camera';
        let html5QrCode = null;
        let isScanning = false;
        let scanHistory = [];

        // DOM 元素
        const modeTabs = document.querySelectorAll('.mode-tab');
        const cameraSection = document.getElementById('camera-section');
        const fileSection = document.getElementById('file-section');
        const cameraSelect = document.getElementById('camera-select');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const fileUploadArea = document.getElementById('file-upload-area');
        const fileInput = document.getElementById('file-input');
        const previewImage = document.getElementById('preview-image');
        const scanFileBtn = document.getElementById('scan-file-btn');
        const resultSection = document.getElementById('result-section');
        const resultFormat = document.getElementById('result-format');
        const resultContent = document.getElementById('result-content');
        const copyBtn = document.getElementById('copy-btn');
        const openLinkBtn = document.getElementById('open-link-btn');
        const historyList = document.getElementById('history-list');

        // 支持的格式配置
        const formatsToSupport = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.AZTEC,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.MAXICODE,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.RSS_14,
            Html5QrcodeSupportedFormats.RSS_EXPANDED,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION
        ];

        /**
         * 初始化
         */
        async function init() {
            // 初始化扫描器
            html5QrCode = new Html5Qrcode("reader", {
                formatsToSupport: formatsToSupport
            });

            // 加载摄像头列表
            await loadCameras();

            // 从本地存储加载历史
            loadHistory();
        }

        /**
         * 加载摄像头列表
         */
        async function loadCameras() {
            try {
                const devices = await Html5Qrcode.getCameras();
                cameraSelect.innerHTML = '';

                if (devices && devices.length > 0) {
                    devices.forEach((device, index) => {
                        const option = document.createElement('option');
                        option.value = device.id;
                        option.textContent = device.label || `摄像头 ${index + 1}`;
                        cameraSelect.appendChild(option);
                    });

                    // 优先选择后置摄像头
                    const backCamera = devices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.includes('后')
                    );
                    if (backCamera) {
                        cameraSelect.value = backCamera.id;
                    }
                } else {
                    cameraSelect.innerHTML = '<option value="">未检测到摄像头</option>';
                    startBtn.disabled = true;
                }
            } catch (err) {
                console.error('获取摄像头失败:', err);
                cameraSelect.innerHTML = '<option value="">获取摄像头失败</option>';
                startBtn.disabled = true;
            }
        }

        /**
         * 切换模式
         */
        function switchMode(mode) {
            currentMode = mode;

            // 更新标签状态
            modeTabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.mode === mode);
            });

            // 切换区域显示
            cameraSection.style.display = mode === 'camera' ? 'block' : 'none';
            fileSection.style.display = mode === 'file' ? 'block' : 'none';

            // 如果切换到文件模式，停止摄像头
            if (mode === 'file' && isScanning) {
                stopScanning();
            }
        }

        /**
         * 开始扫描
         */
        async function startScanning() {
            const cameraId = cameraSelect.value;
            if (!cameraId) {
                alert('请选择摄像头');
                return;
            }

            try {
                await html5QrCode.start(
                    cameraId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    onScanSuccess,
                    onScanError
                );

                isScanning = true;
                startBtn.disabled = true;
                stopBtn.disabled = false;
                cameraSelect.disabled = true;
            } catch (err) {
                console.error('启动摄像头失败:', err);
                alert('启动摄像头失败: ' + err.message);
            }
        }

        /**
         * 停止扫描
         */
        async function stopScanning() {
            if (!isScanning) return;

            try {
                await html5QrCode.stop();
                isScanning = false;
                startBtn.disabled = false;
                stopBtn.disabled = true;
                cameraSelect.disabled = false;
            } catch (err) {
                console.error('停止摄像头失败:', err);
            }
        }

        /**
         * 扫描成功回调
         */
        function onScanSuccess(decodedText, decodedResult) {
            // 播放提示音（可选）
            playBeep();

            // 显示结果
            showResult(decodedText, decodedResult.result.format.formatName);

            // 添加到历史
            addToHistory(decodedText, decodedResult.result.format.formatName);
        }

        /**
         * 扫描错误回调（静默处理）
         */
        function onScanError(errorMessage) {
            // 扫描过程中的错误通常是因为没有检测到码，可以忽略
        }

        /**
         * 显示结果
         */
        function showResult(content, format) {
            resultFormat.textContent = `格式: ${format}`;
            resultContent.textContent = content;
            resultSection.style.display = 'block';

            // 检查是否为链接
            if (isValidUrl(content)) {
                openLinkBtn.style.display = 'inline-block';
                openLinkBtn.onclick = () => window.open(content, '_blank');
            } else {
                openLinkBtn.style.display = 'none';
            }
        }

        /**
         * 验证是否为有效URL
         */
        function isValidUrl(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        }

        /**
         * 播放提示音
         */
        function playBeep() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;

                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.1);
            } catch (e) {
                // 忽略音频错误
            }
        }

        /**
         * 复制内容
         */
        async function copyContent() {
            const content = resultContent.textContent;
            try {
                await navigator.clipboard.writeText(content);
                copyBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyBtn.textContent = '复制内容';
                }, 2000);
            } catch (err) {
                // 降级方案
                const textarea = document.createElement('textarea');
                textarea.value = content;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                copyBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyBtn.textContent = '复制内容';
                }, 2000);
            }
        }

        /**
         * 添加到历史
         */
        function addToHistory(content, format) {
            // 避免重复
            const exists = scanHistory.find(item => item.content === content);
            if (exists) return;

            const item = {
                content,
                format,
                time: new Date().toISOString()
            };

            scanHistory.unshift(item);

            // 限制历史数量
            if (scanHistory.length > 20) {
                scanHistory.pop();
            }

            // 保存到本地存储
            saveHistory();

            // 更新UI
            renderHistory();
        }

        /**
         * 渲染历史列表
         */
        function renderHistory() {
            if (scanHistory.length === 0) {
                historyList.innerHTML = '<li style="color: var(--text-secondary); text-align: center;">暂无扫描历史</li>';
                return;
            }

            historyList.innerHTML = scanHistory.map(item => `
                <li>
                    <span class="history-content" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</span>
                    <span class="history-format">${item.format}</span>
                    <button class="history-copy" onclick="window.BarcodeScanner.copyHistoryItem('${escapeHtml(item.content)}')">复制</button>
                </li>
            `).join('');
        }

        /**
         * 复制历史项
         */
        async function copyHistoryItem(content) {
            try {
                await navigator.clipboard.writeText(content);
            } catch (err) {
                const textarea = document.createElement('textarea');
                textarea.value = content;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        }

        /**
         * HTML转义
         */
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        }

        /**
         * 保存历史到本地存储
         */
        function saveHistory() {
            try {
                localStorage.setItem('barcode-scan-history', JSON.stringify(scanHistory));
            } catch (e) {
                // 忽略存储错误
            }
        }

        /**
         * 从本地存储加载历史
         */
        function loadHistory() {
            try {
                const saved = localStorage.getItem('barcode-scan-history');
                if (saved) {
                    scanHistory = JSON.parse(saved);
                    renderHistory();
                }
            } catch (e) {
                // 忽略加载错误
            }
        }

        /**
         * 处理文件上传
         */
        function handleFileSelect(file) {
            if (!file || !file.type.startsWith('image/')) {
                alert('请选择有效的图片文件');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
                fileUploadArea.querySelector('.upload-placeholder').style.display = 'none';
                scanFileBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }

        /**
         * 扫描图片文件
         */
        async function scanFile() {
            const file = fileInput.files[0];
            if (!file) {
                alert('请先选择图片');
                return;
            }

            try {
                scanFileBtn.textContent = '扫描中...';
                scanFileBtn.disabled = true;

                const result = await html5QrCode.scanFile(file, true);

                // scanFile 返回的是字符串，需要手动获取格式
                showResult(result, '扫描结果');
                addToHistory(result, 'FILE');

            } catch (err) {
                console.error('扫描失败:', err);
                alert('未能识别图片中的条码，请确保图片清晰且包含有效条码');
            } finally {
                scanFileBtn.textContent = '扫描图片';
                scanFileBtn.disabled = false;
            }
        }

        // 事件监听
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => switchMode(tab.dataset.mode));
        });

        startBtn.addEventListener('click', startScanning);
        stopBtn.addEventListener('click', stopScanning);
        copyBtn.addEventListener('click', copyContent);

        // 文件上传
        fileUploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        // 拖放支持
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        scanFileBtn.addEventListener('click', scanFile);

        // 初始化
        await init();

        // 导出到全局
        window.BarcodeScanner = {
            startScanning,
            stopScanning,
            copyHistoryItem
        };
    }

    // 启动主函数
    main();
})();
