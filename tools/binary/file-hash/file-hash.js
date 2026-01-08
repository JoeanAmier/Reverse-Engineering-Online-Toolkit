/**
 * 文件哈希计算工具
 * @description 计算文件的各种哈希值
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let currentFile = null;
    let hashResults = {};
    let sparkMD5LoadPromise = null;

    /**
     * 动态加载 SparkMD5 库 (用于 MD5 计算)
     */
    function loadSparkMD5() {
        if (sparkMD5LoadPromise) {
            return sparkMD5LoadPromise;
        }

        if (window.SparkMD5) {
            return Promise.resolve();
        }

        sparkMD5LoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/spark-md5@3.0.2/spark-md5.min.js';

            script.onload = () => {
                const checkGlobal = () => {
                    if (window.SparkMD5) {
                        resolve();
                    } else {
                        setTimeout(checkGlobal, 10);
                    }
                };
                checkGlobal();
            };

            script.onerror = () => {
                sparkMD5LoadPromise = null;
                reject(new Error('无法加载 SparkMD5 库'));
            };

            document.head.appendChild(script);
        });

        return sparkMD5LoadPromise;
    }

    /**
     * 检查当前是否在文件哈希工具页面
     */
    function isFileHashToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/binary/file-hash');
    }

    /**
     * 格式化文件大小
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化日期
     */
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * 获取选中的算法
     */
    function getSelectedAlgorithms() {
        const algorithms = [];
        if (document.getElementById('algo-md5')?.checked) algorithms.push('MD5');
        if (document.getElementById('algo-sha1')?.checked) algorithms.push('SHA-1');
        if (document.getElementById('algo-sha256')?.checked) algorithms.push('SHA-256');
        if (document.getElementById('algo-sha384')?.checked) algorithms.push('SHA-384');
        if (document.getElementById('algo-sha512')?.checked) algorithms.push('SHA-512');
        return algorithms;
    }

    /**
     * 更新进度条
     */
    function updateProgress(percent) {
        const progressSection = document.getElementById('progress-section');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');

        if (progressSection) progressSection.style.display = 'block';
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressPercent) progressPercent.textContent = Math.round(percent) + '%';
    }

    /**
     * 隐藏进度条
     */
    function hideProgress() {
        const progressSection = document.getElementById('progress-section');
        if (progressSection) progressSection.style.display = 'none';
    }

    /**
     * 使用 SparkMD5 计算 MD5 (支持大文件分块)
     */
    async function calculateMD5(file, onProgress) {
        await loadSparkMD5();

        return new Promise((resolve, reject) => {
            const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
            const chunkSize = 2097152; // 2MB chunks
            const chunks = Math.ceil(file.size / chunkSize);
            let currentChunk = 0;
            const spark = new SparkMD5.ArrayBuffer();
            const fileReader = new FileReader();

            fileReader.onload = function(e) {
                spark.append(e.target.result);
                currentChunk++;

                if (onProgress) {
                    onProgress(currentChunk / chunks * 100);
                }

                if (currentChunk < chunks) {
                    loadNext();
                } else {
                    resolve(spark.end());
                }
            };

            fileReader.onerror = function() {
                reject(new Error('MD5 计算失败'));
            };

            function loadNext() {
                const start = currentChunk * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
            }

            loadNext();
        });
    }

    /**
     * 使用 Web Crypto API 计算 SHA 哈希
     */
    async function calculateSHA(file, algorithm, onProgress) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async function(e) {
                try {
                    if (onProgress) onProgress(50);

                    const hashBuffer = await crypto.subtle.digest(algorithm, e.target.result);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                    if (onProgress) onProgress(100);
                    resolve(hashHex);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = function() {
                reject(new Error(`${algorithm} 计算失败`));
            };

            reader.onprogress = function(e) {
                if (e.lengthComputable && onProgress) {
                    onProgress(e.loaded / e.total * 50);
                }
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 计算所有选中的哈希值
     */
    async function calculateAllHashes(file) {
        const algorithms = getSelectedAlgorithms();
        if (algorithms.length === 0) {
            throw new Error('请至少选择一种哈希算法');
        }

        hashResults = {};
        const totalAlgorithms = algorithms.length;
        let completedAlgorithms = 0;

        for (const algo of algorithms) {
            try {
                let hash;
                const onProgress = (percent) => {
                    const overallProgress = (completedAlgorithms + percent / 100) / totalAlgorithms * 100;
                    updateProgress(overallProgress);
                };

                if (algo === 'MD5') {
                    hash = await calculateMD5(file, onProgress);
                } else {
                    hash = await calculateSHA(file, algo, onProgress);
                }

                hashResults[algo] = hash;
                completedAlgorithms++;
                updateProgress(completedAlgorithms / totalAlgorithms * 100);
            } catch (error) {
                console.error(`${algo} 计算失败:`, error);
                hashResults[algo] = 'Error';
            }
        }

        return hashResults;
    }

    /**
     * 显示哈希结果
     */
    function displayResults(results) {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.style.display = 'block';

        const algorithmMap = {
            'MD5': 'md5',
            'SHA-1': 'sha1',
            'SHA-256': 'sha256',
            'SHA-384': 'sha384',
            'SHA-512': 'sha512'
        };

        // 隐藏所有结果
        for (const key of Object.values(algorithmMap)) {
            const resultEl = document.getElementById(`result-${key}`);
            if (resultEl) resultEl.style.display = 'none';
        }

        // 显示计算的结果
        for (const [algo, hash] of Object.entries(results)) {
            const key = algorithmMap[algo];
            const resultEl = document.getElementById(`result-${key}`);
            const lowerEl = document.getElementById(`${key}-lower`);
            const upperEl = document.getElementById(`${key}-upper`);

            if (resultEl && hash !== 'Error') {
                resultEl.style.display = 'block';
                if (lowerEl) lowerEl.value = hash;
                if (upperEl) upperEl.value = hash.toUpperCase();
            }
        }
    }

    /**
     * 显示文件信息
     */
    function displayFileInfo(file) {
        const fileInfoSection = document.getElementById('file-info-section');
        const fileNameEl = document.getElementById('file-name');
        const fileSizeEl = document.getElementById('file-size');
        const fileTypeEl = document.getElementById('file-type');
        const fileModifiedEl = document.getElementById('file-modified');

        if (fileInfoSection) fileInfoSection.style.display = 'block';
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
        if (fileTypeEl) fileTypeEl.textContent = file.type || 'unknown';
        if (fileModifiedEl) fileModifiedEl.textContent = formatDate(file.lastModified);
    }

    /**
     * 清除所有内容
     */
    function clearAll() {
        currentFile = null;
        hashResults = {};

        const fileInput = document.getElementById('file-input');
        const fileInfoSection = document.getElementById('file-info-section');
        const progressSection = document.getElementById('progress-section');
        const resultsSection = document.getElementById('results-section');
        const verifyInput = document.getElementById('verify-input');
        const verifyResult = document.getElementById('verify-result');

        if (fileInput) fileInput.value = '';
        if (fileInfoSection) fileInfoSection.style.display = 'none';
        if (progressSection) progressSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (verifyInput) verifyInput.value = '';
        if (verifyResult) verifyResult.style.display = 'none';

        // 清除所有哈希输入框
        const hashInputs = document.querySelectorAll('.hash-input');
        hashInputs.forEach(input => input.value = '');
    }

    /**
     * 验证哈希
     */
    function verifyHash(inputHash) {
        if (!inputHash) return null;

        inputHash = inputHash.trim().toLowerCase();
        const algorithms = {
            32: 'MD5',
            40: 'SHA-1',
            64: 'SHA-256',
            96: 'SHA-384',
            128: 'SHA-512'
        };

        const expectedAlgo = algorithms[inputHash.length];
        if (!expectedAlgo) {
            return { match: false, algorithm: null, message: '无效的哈希长度' };
        }

        const storedHash = hashResults[expectedAlgo];
        if (!storedHash) {
            return { match: false, algorithm: expectedAlgo, message: `未计算 ${expectedAlgo}` };
        }

        const match = storedHash.toLowerCase() === inputHash;
        return {
            match,
            algorithm: expectedAlgo,
            message: match ? '匹配' : '不匹配'
        };
    }

    /**
     * 复制所有哈希结果
     */
    function copyAllResults() {
        if (Object.keys(hashResults).length === 0) {
            REOT.utils?.showNotification('没有可复制的结果', 'warning');
            return;
        }

        const fileName = currentFile?.name || 'file';
        let text = `File: ${fileName}\n`;
        text += '-'.repeat(50) + '\n';

        for (const [algo, hash] of Object.entries(hashResults)) {
            if (hash !== 'Error') {
                text += `${algo}: ${hash}\n`;
            }
        }

        REOT.utils?.copyToClipboard(text).then(success => {
            if (success) {
                REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
            }
        });
    }

    // 文件上传处理
    document.addEventListener('change', (e) => {
        if (!isFileHashToolActive()) return;

        if (e.target.id === 'file-input') {
            const file = e.target.files[0];
            if (file) {
                currentFile = file;
                displayFileInfo(file);

                // 隐藏之前的结果
                const resultsSection = document.getElementById('results-section');
                if (resultsSection) resultsSection.style.display = 'none';
            }
        }
    });

    // 拖拽处理
    document.addEventListener('dragover', (e) => {
        if (!isFileHashToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        }
    });

    document.addEventListener('dragleave', (e) => {
        if (!isFileHashToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            uploadArea.classList.remove('drag-over');
        }
    });

    document.addEventListener('drop', (e) => {
        if (!isFileHashToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file) {
                currentFile = file;
                displayFileInfo(file);

                // 更新 file input
                const fileInput = document.getElementById('file-input');
                if (fileInput) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                }

                // 隐藏之前的结果
                const resultsSection = document.getElementById('results-section');
                if (resultsSection) resultsSection.style.display = 'none';
            }
        }
    });

    // 点击事件处理
    document.addEventListener('click', async (e) => {
        if (!isFileHashToolActive()) return;

        const target = e.target;

        // 计算按钮
        if (target.id === 'calculate-btn' || target.closest('#calculate-btn')) {
            if (!currentFile) {
                REOT.utils?.showNotification('请先选择文件', 'warning');
                return;
            }

            try {
                const results = await calculateAllHashes(currentFile);
                displayResults(results);
                hideProgress();
                REOT.utils?.showNotification('计算完成', 'success');
            } catch (error) {
                hideProgress();
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            clearAll();
        }

        // 复制全部按钮
        if (target.id === 'copy-all-btn' || target.closest('#copy-all-btn')) {
            copyAllResults();
        }

        // 单个哈希复制按钮
        if (target.classList.contains('copy-hash-btn') || target.closest('.copy-hash-btn')) {
            const btn = target.classList.contains('copy-hash-btn') ? target : target.closest('.copy-hash-btn');
            const algorithm = btn.dataset.algorithm;
            const lowerEl = document.getElementById(`${algorithm}-lower`);

            if (lowerEl && lowerEl.value) {
                REOT.utils?.copyToClipboard(lowerEl.value).then(success => {
                    if (success) {
                        REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                    }
                });
            }
        }

        // 验证按钮
        if (target.id === 'verify-btn' || target.closest('#verify-btn')) {
            const verifyInput = document.getElementById('verify-input');
            const verifyResult = document.getElementById('verify-result');
            const verifyStatus = document.getElementById('verify-status');
            const verifyAlgorithm = document.getElementById('verify-algorithm');

            if (!verifyInput?.value) {
                REOT.utils?.showNotification('请输入要验证的哈希值', 'warning');
                return;
            }

            const result = verifyHash(verifyInput.value);
            if (verifyResult && verifyStatus && verifyAlgorithm) {
                verifyResult.style.display = 'flex';
                verifyStatus.textContent = result.message;
                verifyStatus.className = 'verify-status ' + (result.match ? 'match' : 'no-match');
                verifyAlgorithm.textContent = result.algorithm || '';
            }
        }
    });

    // 预加载 SparkMD5
    loadSparkMD5().catch(err => console.warn('SparkMD5 预加载失败:', err.message));

    // 导出工具函数
    window.FileHashTool = {
        calculateMD5,
        calculateSHA,
        formatFileSize
    };

})();
