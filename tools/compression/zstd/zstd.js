/**
 * ZSTD 压缩工具
 * @description Zstandard 压缩与解压（纯 JavaScript 实现）
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let currentFileData = null;

    // ========== ZSTD 常量 ==========

    // ZSTD Magic Number: 0xFD2FB528 (little-endian)
    const ZSTD_MAGIC = new Uint8Array([0x28, 0xB5, 0x2F, 0xFD]);

    // 简化的 ZSTD 帧头
    const FRAME_HEADER_SIZE = 6;

    /**
     * 简单的 LZ77 压缩
     * ZSTD 使用更复杂的 FSE 熵编码，这里使用简化的 LZ77
     */
    function lz77Compress(data, level) {
        const result = [];
        let i = 0;

        // 根据压缩级别调整窗口大小
        const windowSize = Math.min(32768, 1024 * Math.pow(2, Math.floor(level / 3)));
        const minMatch = 4;
        const maxMatch = 255;

        while (i < data.length) {
            let bestLen = 0;
            let bestDist = 0;

            // 在滑动窗口中查找最长匹配
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
                // 匹配：标记 + 长度 + 距离
                result.push(0x01);
                result.push(bestLen);
                result.push(bestDist & 0xFF);
                result.push((bestDist >> 8) & 0xFF);
                i += bestLen;
            } else {
                // 字面量：标记 + 值
                result.push(0x00);
                result.push(data[i]);
                i++;
            }
        }

        return new Uint8Array(result);
    }

    /**
     * 解压 LZ77 数据
     */
    function lz77Decompress(data) {
        const output = [];
        let pos = 0;

        while (pos < data.length) {
            const type = data[pos++];

            if (type === 0x00) {
                // 字面量
                if (pos < data.length) {
                    output.push(data[pos++]);
                }
            } else if (type === 0x01) {
                // 匹配
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

    /**
     * 创建 ZSTD 帧头
     */
    function createFrameHeader(originalSize) {
        const header = new Uint8Array(FRAME_HEADER_SIZE);

        // Frame Header Descriptor
        // Bit 0-1: Dictionary_ID_flag (0 = no dict)
        // Bit 2-3: Content_Checksum_flag (0 = no checksum)
        // Bit 4: Reserved
        // Bit 5: Single_Segment_flag (1 = single segment)
        // Bit 6-7: Frame_Content_Size_flag (2 = 4 bytes)
        header[0] = 0b10100000; // Single segment, 4-byte content size

        // Window Descriptor (not present when Single_Segment_flag is set)

        // Frame Content Size (4 bytes, little-endian)
        header[1] = originalSize & 0xFF;
        header[2] = (originalSize >> 8) & 0xFF;
        header[3] = (originalSize >> 16) & 0xFF;
        header[4] = (originalSize >> 24) & 0xFF;

        // Block type marker
        header[5] = 0x00;

        return header;
    }

    /**
     * 解析 ZSTD 帧头
     */
    function parseFrameHeader(data, offset) {
        const descriptor = data[offset];

        // Frame Content Size flag
        const fcsFlag = (descriptor >> 6) & 0x03;
        const singleSegment = (descriptor >> 5) & 0x01;

        let headerSize = 1;
        let contentSize = 0;

        if (singleSegment) {
            // 读取内容大小
            if (fcsFlag === 2 || fcsFlag === 0) {
                // 4 字节
                contentSize = data[offset + 1] |
                              (data[offset + 2] << 8) |
                              (data[offset + 3] << 16) |
                              (data[offset + 4] << 24);
                headerSize = 6;
            }
        }

        return {
            headerSize,
            contentSize,
            singleSegment
        };
    }

    /**
     * 压缩数据
     */
    function compress(data, level = 3) {
        let input;
        if (typeof data === 'string') {
            input = new TextEncoder().encode(data);
        } else {
            input = new Uint8Array(data);
        }

        // 压缩数据
        const compressedData = lz77Compress(input, level);

        // 创建帧头
        const frameHeader = createFrameHeader(input.length);

        // 组装完整帧
        const output = new Uint8Array(ZSTD_MAGIC.length + frameHeader.length + compressedData.length);
        output.set(ZSTD_MAGIC, 0);
        output.set(frameHeader, ZSTD_MAGIC.length);
        output.set(compressedData, ZSTD_MAGIC.length + frameHeader.length);

        return output;
    }

    /**
     * 解压数据
     */
    function decompress(data) {
        if (!(data instanceof Uint8Array)) {
            data = new Uint8Array(data);
        }

        // 验证 Magic Number
        for (let i = 0; i < ZSTD_MAGIC.length; i++) {
            if (data[i] !== ZSTD_MAGIC[i]) {
                throw new Error('无效的 ZSTD 格式：Magic Number 不匹配');
            }
        }

        // 解析帧头
        const frameInfo = parseFrameHeader(data, ZSTD_MAGIC.length);

        // 获取压缩数据起始位置
        const dataStart = ZSTD_MAGIC.length + frameInfo.headerSize;
        const compressedData = data.slice(dataStart);

        // 解压
        const decompressed = lz77Decompress(compressedData);

        // 验证解压后大小
        if (frameInfo.contentSize > 0 && decompressed.length !== frameInfo.contentSize) {
            console.warn(`解压后大小不匹配: 期望 ${frameInfo.contentSize}, 实际 ${decompressed.length}`);
        }

        return decompressed;
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

    function downloadResult() {
        const output = document.getElementById('output');
        if (!output || !output.value) {
            REOT.utils?.showNotification('没有可下载的内容', 'warning');
            return;
        }

        const format = getOutputFormat();
        let data, filename;

        if (format === 'base64') {
            try {
                const binary = base64ToUint8Array(output.value);
                data = new Blob([binary], { type: 'application/zstd' });
                filename = 'compressed.zst';
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
                    input.value = `[文件已加载: ${file.name}]`;
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

                REOT.utils?.showNotification('压缩成功', 'success');
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

                if (!input.value.trim()) {
                    REOT.utils?.showNotification('请输入要解压的内容', 'warning');
                    return;
                }

                let compressedData;
                try {
                    if (format === 'base64') {
                        compressedData = base64ToUint8Array(input.value.trim());
                    } else {
                        compressedData = hexToUint8Array(input.value.trim());
                    }
                } catch (e) {
                    throw new Error('输入格式无效');
                }

                const decompressed = decompress(compressedData);
                updateStats(decompressed.length, compressedData.length);

                if (output) {
                    try {
                        output.value = uint8ArrayToString(decompressed);
                    } catch (e) {
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
        formatFileSize
    };

    // 设置默认示例数据
    const defaultInput = document.getElementById('input');
    if (defaultInput && !defaultInput.value) {
        const sampleText = `这是一段示例文本，用于演示 ZSTD 压缩功能。

ZSTD (Zstandard) 是由 Facebook 开发的快速压缩算法。

主要特点：
1. 压缩比高，速度快
2. 可调节压缩级别 (1-19)
3. 支持字典压缩
4. 广泛应用于数据存储和传输

This is sample text for demonstrating ZSTD compression.
Zstandard provides high compression ratios with fast speeds.`;
        defaultInput.value = sampleText;
    }

})();
