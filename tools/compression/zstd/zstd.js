/**
 * ZSTD 压缩工具
 * @description Zstandard 压缩与解压
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let currentFileData = null;
    let fzstdLoaded = false;

    // ========== ZSTD 常量 ==========

    // ZSTD Magic Number: 0xFD2FB528 (little-endian)
    const ZSTD_MAGIC = new Uint8Array([0x28, 0xB5, 0x2F, 0xFD]);

    // ========== 动态加载 fzstd 库 ==========

    function loadFzstd() {
        return new Promise((resolve, reject) => {
            if (fzstdLoaded && window.fzstd) {
                resolve(window.fzstd);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/fzstd@0.1.1/umd/index.js';
            script.onload = () => {
                fzstdLoaded = true;
                resolve(window.fzstd);
            };
            script.onerror = () => {
                reject(new Error('无法加载 ZSTD 解压库'));
            };
            document.head.appendChild(script);
        });
    }

    // ========== 简化的压缩实现 ==========
    // 注意：这是简化实现，生成的文件只能被本工具解压
    // 真实的 ZSTD 压缩需要更复杂的实现

    /**
     * 简单的 LZ77 压缩 (用于演示)
     */
    function simpleLz77Compress(data, level) {
        const result = [];
        let i = 0;

        const windowSize = Math.min(32768, 1024 * Math.pow(2, Math.floor(level / 3)));
        const minMatch = 4;
        const maxMatch = 255;

        while (i < data.length) {
            let bestLen = 0;
            let bestDist = 0;

            const searchStart = Math.max(0, i - windowSize);
            for (let j = searchStart; j < i; j++) {
                let len = 0;
                while (len < maxMatch && i + len < data.length && data[j + len] === data[i + len]) {
                    len++;
                }
                if (len >= minMatch && len > bestLen) {
                    bestLen = len;
                    bestDist = i - j;
                }
            }

            if (bestLen >= minMatch) {
                result.push(0x01);
                result.push(bestLen);
                result.push(bestDist & 0xFF);
                result.push((bestDist >> 8) & 0xFF);
                i += bestLen;
            } else {
                result.push(0x00);
                result.push(data[i]);
                i++;
            }
        }

        return new Uint8Array(result);
    }

    /**
     * 解压简化的 LZ77 数据
     */
    function simpleLz77Decompress(data) {
        const output = [];
        let pos = 0;

        while (pos < data.length) {
            const type = data[pos++];

            if (type === 0x00) {
                if (pos < data.length) {
                    output.push(data[pos++]);
                }
            } else if (type === 0x01) {
                if (pos + 2 < data.length) {
                    const length = data[pos++];
                    const distance = data[pos] | (data[pos + 1] << 8);
                    pos += 2;

                    const start = output.length - distance;
                    for (let j = 0; j < length; j++) {
                        output.push(output[start + j]);
                    }
                }
            }
        }

        return new Uint8Array(output);
    }

    // 自定义压缩标记 (避免与真实 ZSTD 混淆)
    const CUSTOM_MAGIC = new Uint8Array([0x52, 0x45, 0x4F, 0x54]); // "REOT"

    /**
     * 压缩数据 (简化实现)
     */
    function compress(data, level = 3) {
        let input;
        if (typeof data === 'string') {
            input = new TextEncoder().encode(data);
        } else {
            input = new Uint8Array(data);
        }

        const compressedData = simpleLz77Compress(input, level);

        // 使用自定义头，包含原始大小
        const header = new Uint8Array(8);
        header.set(CUSTOM_MAGIC, 0);
        header[4] = input.length & 0xFF;
        header[5] = (input.length >> 8) & 0xFF;
        header[6] = (input.length >> 16) & 0xFF;
        header[7] = (input.length >> 24) & 0xFF;

        const output = new Uint8Array(header.length + compressedData.length);
        output.set(header, 0);
        output.set(compressedData, header.length);

        return output;
    }

    /**
     * 检查是否是真实的 ZSTD 格式
     */
    function isRealZstd(data) {
        if (data.length < 4) return false;
        return data[0] === 0x28 && data[1] === 0xB5 && data[2] === 0x2F && data[3] === 0xFD;
    }

    /**
     * 检查是否是自定义压缩格式
     */
    function isCustomFormat(data) {
        if (data.length < 4) return false;
        return data[0] === 0x52 && data[1] === 0x45 && data[2] === 0x4F && data[3] === 0x54;
    }

    /**
     * 解压数据
     */
    async function decompress(data) {
        if (!(data instanceof Uint8Array)) {
            data = new Uint8Array(data);
        }

        // 检查是否是真实的 ZSTD 格式
        if (isRealZstd(data)) {
            // 使用 fzstd 库解压
            const fzstd = await loadFzstd();
            try {
                return fzstd.decompress(data);
            } catch (e) {
                throw new Error('ZSTD 解压失败: ' + e.message);
            }
        }

        // 检查是否是自定义格式
        if (isCustomFormat(data)) {
            const originalSize = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24);
            const compressedData = data.slice(8);
            const decompressed = simpleLz77Decompress(compressedData);

            if (decompressed.length !== originalSize) {
                console.warn(`解压大小不匹配: 期望 ${originalSize}, 实际 ${decompressed.length}`);
            }

            return decompressed;
        }

        throw new Error('无效的压缩格式：既不是 ZSTD 也不是本工具的压缩格式');
    }

    // ========== 工具函数 ==========

    function stringToUint8Array(str) {
        return new TextEncoder().encode(str);
    }

    function uint8ArrayToString(arr) {
        return new TextDecoder().decode(arr);
    }

    function uint8ArrayToBase64(arr) {
        let binary = '';
        for (let i = 0; i < arr.length; i++) {
            binary += String.fromCharCode(arr[i]);
        }
        return btoa(binary);
    }

    function base64ToUint8Array(base64) {
        const binary = atob(base64);
        const arr = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            arr[i] = binary.charCodeAt(i);
        }
        return arr;
    }

    function uint8ArrayToHex(arr) {
        return Array.from(arr)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function hexToUint8Array(hex) {
        hex = hex.replace(/\s/g, '');
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < arr.length; i++) {
            arr[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return arr;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getCompressionLevel() {
        const levelSelect = document.getElementById('compression-level');
        return parseInt(levelSelect?.value || '3', 10);
    }

    function getOutputFormat() {
        const formatSelect = document.getElementById('output-format');
        return formatSelect?.value || 'base64';
    }

    function updateStats(originalSize, compressedSize) {
        const statsSection = document.getElementById('stats-section');
        const originalSizeEl = document.getElementById('original-size');
        const compressedSizeEl = document.getElementById('compressed-size');
        const ratioEl = document.getElementById('compression-ratio');

        if (statsSection && originalSizeEl && compressedSizeEl && ratioEl) {
            statsSection.style.display = 'block';
            originalSizeEl.textContent = formatFileSize(originalSize);
            compressedSizeEl.textContent = formatFileSize(compressedSize);

            const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            ratioEl.textContent = `${ratio}%`;
        }
    }

    function downloadResult(isDecompressed = false) {
        const output = document.getElementById('output');
        if (!output || !output.value) {
            REOT.utils?.showNotification('没有可下载的内容', 'warning');
            return;
        }

        const format = getOutputFormat();
        let data, filename;

        if (isDecompressed) {
            // 解压后的数据，作为文本或二进制下载
            data = new Blob([output.value], { type: 'application/octet-stream' });
            filename = 'decompressed.bin';
        } else if (format === 'base64') {
            try {
                const binary = base64ToUint8Array(output.value);
                data = new Blob([binary], { type: 'application/octet-stream' });
                filename = 'compressed.bin';
            } catch (e) {
                data = new Blob([output.value], { type: 'text/plain' });
                filename = 'result.txt';
            }
        } else {
            data = new Blob([output.value], { type: 'text/plain' });
            filename = 'result.txt';
        }

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 检查当前是否在 ZSTD 工具页面
    function isZstdToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/compression/zstd');
    }

    // 文件上传处理
    document.addEventListener('change', (e) => {
        if (!isZstdToolActive()) return;

        if (e.target.id === 'file-input') {
            const file = e.target.files[0];
            if (!file) return;

            const fileInfo = document.getElementById('file-info');
            const input = document.getElementById('input');

            const reader = new FileReader();
            reader.onload = (event) => {
                currentFileData = new Uint8Array(event.target.result);

                if (fileInfo) {
                    fileInfo.style.display = 'block';
                    fileInfo.innerHTML = `
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${formatFileSize(file.size)}</span>
                    `;
                }

                if (input) {
                    // 检测文件类型
                    let fileType = '二进制文件';
                    if (isRealZstd(currentFileData)) {
                        fileType = 'ZSTD 压缩文件';
                    } else if (isCustomFormat(currentFileData)) {
                        fileType = '本工具压缩文件';
                    }
                    input.value = `[${fileType}已加载: ${file.name}]`;
                    input.disabled = true;
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // 事件委托处理器
    document.addEventListener('click', async (e) => {
        if (!isZstdToolActive()) return;

        const target = e.target;

        // 压缩按钮
        if (target.id === 'compress-btn' || target.closest('#compress-btn')) {
            try {
                const input = document.getElementById('input');
                const output = document.getElementById('output');
                const format = getOutputFormat();
                const level = getCompressionLevel();

                let data;
                if (currentFileData) {
                    data = currentFileData;
                } else {
                    data = input.value;
                }

                if (!data || (typeof data === 'string' && !data.trim())) {
                    REOT.utils?.showNotification('请输入要压缩的内容', 'warning');
                    return;
                }

                const compressed = compress(data, level);
                updateStats(
                    typeof data === 'string' ? stringToUint8Array(data).length : data.length,
                    compressed.length
                );

                if (output) {
                    output.value = format === 'base64'
                        ? uint8ArrayToBase64(compressed)
                        : uint8ArrayToHex(compressed);
                }

                REOT.utils?.showNotification('压缩成功 (本工具格式)', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 解压按钮
        if (target.id === 'decompress-btn' || target.closest('#decompress-btn')) {
            try {
                const input = document.getElementById('input');
                const output = document.getElementById('output');
                const format = getOutputFormat();

                let compressedData;

                // 优先使用文件数据
                if (currentFileData) {
                    compressedData = currentFileData;
                } else if (input.value.trim()) {
                    try {
                        if (format === 'base64') {
                            compressedData = base64ToUint8Array(input.value.trim());
                        } else {
                            compressedData = hexToUint8Array(input.value.trim());
                        }
                    } catch (e) {
                        throw new Error('输入格式无效');
                    }
                } else {
                    REOT.utils?.showNotification('请输入要解压的内容或上传文件', 'warning');
                    return;
                }

                // 显示加载提示
                REOT.utils?.showNotification('正在解压...', 'info');

                const decompressed = await decompress(compressedData);
                updateStats(decompressed.length, compressedData.length);

                if (output) {
                    try {
                        // 尝试作为文本显示
                        output.value = uint8ArrayToString(decompressed);
                    } catch (e) {
                        // 如果不是有效文本，显示为 Base64
                        output.value = uint8ArrayToBase64(decompressed);
                    }
                }

                REOT.utils?.showNotification('解压成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const input = document.getElementById('input');
            const output = document.getElementById('output');
            const fileInfo = document.getElementById('file-info');
            const fileInput = document.getElementById('file-input');
            const statsSection = document.getElementById('stats-section');

            if (input) {
                input.value = '';
                input.disabled = false;
            }
            if (output) output.value = '';
            if (fileInfo) fileInfo.style.display = 'none';
            if (fileInput) fileInput.value = '';
            if (statsSection) statsSection.style.display = 'none';
            currentFileData = null;
        }

        // 复制按钮
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            const output = document.getElementById('output');
            if (output && output.value) {
                const success = await REOT.utils?.copyToClipboard(output.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }

        // 下载按钮
        if (target.id === 'download-btn' || target.closest('#download-btn')) {
            downloadResult();
        }
    });

    // 导出工具函数
    window.ZstdTool = {
        compress,
        decompress,
        formatFileSize,
        isRealZstd,
        loadFzstd
    };

    // 设置默认示例数据
    const defaultInput = document.getElementById('input');
    if (defaultInput && !defaultInput.value) {
        const sampleText = `这是一段示例文本，用于演示压缩功能。

ZSTD (Zstandard) 是由 Facebook 开发的快速压缩算法。

主要特点：
1. 压缩比高，速度快
2. 可调节压缩级别 (1-22)
3. 支持字典压缩
4. 广泛应用于数据存储和传输

提示：
- 上传 .zst 文件可以解压真实的 ZSTD 压缩文件
- 本工具的压缩功能使用简化算法，仅供演示

This is sample text for demonstrating compression.`;
        defaultInput.value = sampleText;
    }

    // 预加载 fzstd 库
    loadFzstd().catch(() => {
        console.warn('fzstd 库预加载失败，将在需要时重试');
    });

})();
