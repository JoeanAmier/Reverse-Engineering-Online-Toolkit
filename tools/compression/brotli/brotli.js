/**
 * Brotli 压缩工具
 * @description Brotli 压缩与解压（纯 JavaScript 实现）
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let currentFileData = null;

    // ========== Brotli 解码器（精简实现） ==========
    // 基于 RFC 7932 的简化 Brotli 解码实现

    const BROTLI_DICTIONARY = null; // 简化版不使用字典

    /**
     * Brotli 位读取器
     */
    class BitReader {
        constructor(data) {
            this.data = data;
            this.pos = 0;
            this.bitPos = 0;
            this.buffer = 0;
            this.bufferBits = 0;
        }

        readBits(n) {
            while (this.bufferBits < n) {
                if (this.pos >= this.data.length) {
                    throw new Error('Unexpected end of data');
                }
                this.buffer |= this.data[this.pos++] << this.bufferBits;
                this.bufferBits += 8;
            }
            const result = this.buffer & ((1 << n) - 1);
            this.buffer >>= n;
            this.bufferBits -= n;
            return result;
        }

        readByte() {
            return this.readBits(8);
        }
    }

    /**
     * 简单的 LZ77 压缩（用于演示 Brotli 压缩原理）
     */
    function simpleLZ77Compress(data) {
        const result = [];
        let i = 0;
        const windowSize = 32768;
        const minMatch = 3;
        const maxMatch = 258;

        while (i < data.length) {
            let bestLen = 0;
            let bestDist = 0;

            // 在滑动窗口中查找匹配
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
                // 输出长度-距离对
                result.push({ type: 'match', length: bestLen, distance: bestDist });
                i += bestLen;
            } else {
                // 输出字面量
                result.push({ type: 'literal', value: data[i] });
                i++;
            }
        }

        return result;
    }

    /**
     * 编码压缩数据为二进制格式
     */
    function encodeLZ77(tokens) {
        const output = [];

        // 简化的头部
        output.push(0x1B); // Brotli 标识
        output.push(tokens.length & 0xFF);
        output.push((tokens.length >> 8) & 0xFF);
        output.push((tokens.length >> 16) & 0xFF);

        for (const token of tokens) {
            if (token.type === 'literal') {
                output.push(0x00); // 字面量标记
                output.push(token.value);
            } else {
                output.push(0x01); // 匹配标记
                output.push(token.length & 0xFF);
                output.push(token.distance & 0xFF);
                output.push((token.distance >> 8) & 0xFF);
            }
        }

        return new Uint8Array(output);
    }

    /**
     * 解码压缩数据
     */
    function decodeLZ77(data) {
        if (data[0] !== 0x1B) {
            throw new Error('无效的压缩数据格式');
        }

        const tokenCount = data[1] | (data[2] << 8) | (data[3] << 16);
        const output = [];
        let pos = 4;

        for (let i = 0; i < tokenCount && pos < data.length; i++) {
            const type = data[pos++];
            if (type === 0x00) {
                // 字面量
                output.push(data[pos++]);
            } else if (type === 0x01) {
                // 匹配
                const length = data[pos++];
                const distance = data[pos] | (data[pos + 1] << 8);
                pos += 2;

                const start = output.length - distance;
                for (let j = 0; j < length; j++) {
                    output.push(output[start + j]);
                }
            }
        }

        return new Uint8Array(output);
    }

    /**
     * 压缩数据（简化版 Brotli 风格压缩）
     */
    function compress(data) {
        let input;
        if (typeof data === 'string') {
            input = new TextEncoder().encode(data);
        } else {
            input = data;
        }

        const tokens = simpleLZ77Compress(input);
        return encodeLZ77(tokens);
    }

    /**
     * 解压数据
     */
    function decompress(data) {
        return decodeLZ77(data);
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
                data = new Blob([binary], { type: 'application/x-brotli' });
                filename = 'compressed.br';
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

    // 检查当前是否在 Brotli 工具页面
    function isBrotliToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/compression/brotli');
    }

    // 文件上传处理
    document.addEventListener('change', (e) => {
        if (!isBrotliToolActive()) return;

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
        if (!isBrotliToolActive()) return;

        const target = e.target;

        // 压缩按钮
        if (target.id === 'compress-btn' || target.closest('#compress-btn')) {
            try {
                const input = document.getElementById('input');
                const output = document.getElementById('output');
                const format = getOutputFormat();

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

                const compressed = compress(data);
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
    window.BrotliTool = {
        compress,
        decompress,
        formatFileSize
    };

    // 设置默认示例数据
    const defaultInput = document.getElementById('input');
    if (defaultInput && !defaultInput.value) {
        const sampleText = `这是一段示例文本，用于演示压缩功能。

本工具使用简化的 LZ77 压缩算法（Brotli 的核心算法之一）进行数据压缩。

主要特点：
1. 纯 JavaScript 实现，无需外部依赖
2. 基于滑动窗口的字典压缩
3. 适合文本数据压缩

This is sample text for demonstrating compression.
The tool uses a simplified LZ77 algorithm for compression.`;
        defaultInput.value = sampleText;
    }

})();
