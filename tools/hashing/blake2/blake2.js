/**
 * BLAKE2 哈希工具
 * @description BLAKE2b 和 BLAKE2s 哈希计算（纯 JavaScript 实现）
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let currentFileData = null;

    // ========== BLAKE2b 实现 ==========

    const BLAKE2B_IV = [
        0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn,
        0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n,
        0x510e527fade682d1n, 0x9b05688c2b3e6c1fn,
        0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n
    ];

    const BLAKE2B_SIGMA = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
        [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
        [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
        [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
        [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
        [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
        [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
        [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
        [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3]
    ];

    function rotr64(x, n) {
        return ((x >> BigInt(n)) | (x << BigInt(64 - n))) & 0xffffffffffffffffn;
    }

    function blake2bG(v, a, b, c, d, x, y) {
        v[a] = (v[a] + v[b] + x) & 0xffffffffffffffffn;
        v[d] = rotr64(v[d] ^ v[a], 32);
        v[c] = (v[c] + v[d]) & 0xffffffffffffffffn;
        v[b] = rotr64(v[b] ^ v[c], 24);
        v[a] = (v[a] + v[b] + y) & 0xffffffffffffffffn;
        v[d] = rotr64(v[d] ^ v[a], 16);
        v[c] = (v[c] + v[d]) & 0xffffffffffffffffn;
        v[b] = rotr64(v[b] ^ v[c], 63);
    }

    function blake2bCompress(h, block, t, f) {
        const v = new Array(16);
        const m = new Array(16);

        for (let i = 0; i < 8; i++) {
            v[i] = h[i];
            v[i + 8] = BLAKE2B_IV[i];
        }

        v[12] ^= t;
        v[14] ^= f ? 0xffffffffffffffffn : 0n;

        for (let i = 0; i < 16; i++) {
            m[i] = 0n;
            for (let j = 0; j < 8; j++) {
                m[i] |= BigInt(block[i * 8 + j]) << BigInt(j * 8);
            }
        }

        for (let r = 0; r < 12; r++) {
            const s = BLAKE2B_SIGMA[r];
            blake2bG(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
            blake2bG(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
            blake2bG(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
            blake2bG(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
            blake2bG(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
            blake2bG(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
            blake2bG(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
            blake2bG(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
        }

        for (let i = 0; i < 8; i++) {
            h[i] ^= v[i] ^ v[i + 8];
        }
    }

    function blake2b(data, key = null, outlen = 32) {
        if (outlen < 1 || outlen > 64) {
            throw new Error('BLAKE2b 输出长度必须在 1-64 字节之间');
        }

        const keylen = key ? key.length : 0;
        if (keylen > 64) {
            throw new Error('BLAKE2b 密钥长度不能超过 64 字节');
        }

        // 初始化状态
        const h = [...BLAKE2B_IV];
        h[0] ^= BigInt(0x01010000 ^ (keylen << 8) ^ outlen);

        // 处理密钥
        let t = 0n;
        const block = new Uint8Array(128);

        if (keylen > 0) {
            block.set(key);
            t = 128n;
            blake2bCompress(h, block, t, false);
            block.fill(0);
        }

        // 处理消息
        let pos = 0;
        while (pos + 128 <= data.length) {
            block.set(data.slice(pos, pos + 128));
            t += 128n;
            blake2bCompress(h, block, t, false);
            pos += 128;
        }

        // 最后一个块
        block.fill(0);
        const remaining = data.length - pos;
        block.set(data.slice(pos));
        t += BigInt(remaining);
        blake2bCompress(h, block, t, true);

        // 输出
        const out = new Uint8Array(outlen);
        for (let i = 0; i < outlen; i++) {
            out[i] = Number((h[Math.floor(i / 8)] >> BigInt((i % 8) * 8)) & 0xffn);
        }

        return out;
    }

    // ========== BLAKE2s 实现 ==========

    const BLAKE2S_IV = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    const BLAKE2S_SIGMA = BLAKE2B_SIGMA.map(row => row.slice(0, 16));

    function rotr32(x, n) {
        return ((x >>> n) | (x << (32 - n))) >>> 0;
    }

    function blake2sG(v, a, b, c, d, x, y) {
        v[a] = (v[a] + v[b] + x) >>> 0;
        v[d] = rotr32(v[d] ^ v[a], 16);
        v[c] = (v[c] + v[d]) >>> 0;
        v[b] = rotr32(v[b] ^ v[c], 12);
        v[a] = (v[a] + v[b] + y) >>> 0;
        v[d] = rotr32(v[d] ^ v[a], 8);
        v[c] = (v[c] + v[d]) >>> 0;
        v[b] = rotr32(v[b] ^ v[c], 7);
    }

    function blake2sCompress(h, block, t, f) {
        const v = new Array(16);
        const m = new Array(16);

        for (let i = 0; i < 8; i++) {
            v[i] = h[i];
            v[i + 8] = BLAKE2S_IV[i];
        }

        v[12] ^= t & 0xffffffff;
        v[13] ^= (t / 0x100000000) >>> 0;
        if (f) v[14] ^= 0xffffffff;

        for (let i = 0; i < 16; i++) {
            m[i] = (block[i * 4] |
                    (block[i * 4 + 1] << 8) |
                    (block[i * 4 + 2] << 16) |
                    (block[i * 4 + 3] << 24)) >>> 0;
        }

        for (let r = 0; r < 10; r++) {
            const s = BLAKE2S_SIGMA[r];
            blake2sG(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
            blake2sG(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
            blake2sG(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
            blake2sG(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
            blake2sG(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
            blake2sG(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
            blake2sG(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
            blake2sG(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
        }

        for (let i = 0; i < 8; i++) {
            h[i] ^= v[i] ^ v[i + 8];
        }
    }

    function blake2s(data, key = null, outlen = 32) {
        if (outlen < 1 || outlen > 32) {
            throw new Error('BLAKE2s 输出长度必须在 1-32 字节之间');
        }

        const keylen = key ? key.length : 0;
        if (keylen > 32) {
            throw new Error('BLAKE2s 密钥长度不能超过 32 字节');
        }

        // 初始化状态
        const h = [...BLAKE2S_IV];
        h[0] ^= 0x01010000 ^ (keylen << 8) ^ outlen;

        // 处理密钥
        let t = 0;
        const block = new Uint8Array(64);

        if (keylen > 0) {
            block.set(key);
            t = 64;
            blake2sCompress(h, block, t, false);
            block.fill(0);
        }

        // 处理消息
        let pos = 0;
        while (pos + 64 <= data.length) {
            block.set(data.slice(pos, pos + 64));
            t += 64;
            blake2sCompress(h, block, t, false);
            pos += 64;
        }

        // 最后一个块
        block.fill(0);
        const remaining = data.length - pos;
        block.set(data.slice(pos));
        t += remaining;
        blake2sCompress(h, block, t, true);

        // 输出
        const out = new Uint8Array(outlen);
        for (let i = 0; i < outlen; i++) {
            out[i] = (h[Math.floor(i / 4)] >> ((i % 4) * 8)) & 0xff;
        }

        return out;
    }

    // ========== 工具函数 ==========

    function stringToUint8Array(str) {
        return new TextEncoder().encode(str);
    }

    function uint8ArrayToHex(arr) {
        return Array.from(arr)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getAlgorithm() {
        const algorithmSelect = document.getElementById('algorithm-select');
        return algorithmSelect?.value || 'blake2b';
    }

    function getOutputLength() {
        const lengthSelect = document.getElementById('output-length');
        return parseInt(lengthSelect?.value || '32', 10);
    }

    function getKey() {
        const keyInput = document.getElementById('key-input');
        const keyValue = keyInput?.value || '';
        return keyValue ? stringToUint8Array(keyValue) : null;
    }

    /**
     * 计算 BLAKE2 哈希
     */
    function calculateHash(data) {
        const algorithm = getAlgorithm();
        let outputLength = getOutputLength();
        const key = getKey();

        let input;
        if (typeof data === 'string') {
            input = stringToUint8Array(data);
        } else {
            input = data;
        }

        let hashBytes;

        if (algorithm === 'blake2b') {
            if (outputLength > 64) outputLength = 64;
            hashBytes = blake2b(input, key, outputLength);
        } else {
            if (outputLength > 32) outputLength = 32;
            hashBytes = blake2s(input, key, outputLength);
        }

        return uint8ArrayToHex(hashBytes);
    }

    /**
     * 更新输出
     */
    function updateOutput() {
        try {
            let data;
            const input = document.getElementById('input');

            if (currentFileData) {
                data = currentFileData;
            } else {
                data = input?.value || '';
            }

            if (!data || (typeof data === 'string' && !data.trim())) {
                const outputLower = document.getElementById('output-lower');
                const outputUpper = document.getElementById('output-upper');
                if (outputLower) outputLower.value = '';
                if (outputUpper) outputUpper.value = '';
                return;
            }

            const result = calculateHash(data);
            const outputLower = document.getElementById('output-lower');
            const outputUpper = document.getElementById('output-upper');

            if (outputLower) outputLower.value = result;
            if (outputUpper) outputUpper.value = result.toUpperCase();

        } catch (error) {
            const outputLower = document.getElementById('output-lower');
            if (outputLower) outputLower.value = '错误: ' + error.message;
            REOT.utils?.showNotification(error.message, 'error');
        }
    }

    // 检查当前是否在 BLAKE2 工具页面
    function isBlake2ToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/hashing/blake2');
    }

    // 文件上传处理
    document.addEventListener('change', (e) => {
        if (!isBlake2ToolActive()) return;

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

                updateOutput();
            };
            reader.readAsArrayBuffer(file);
        }

        // 算法和输出长度变化
        if (e.target.id === 'algorithm-select') {
            updateOutputLengthOptions();
            const input = document.getElementById('input');
            if ((input && input.value) || currentFileData) {
                updateOutput();
            }
        }

        if (e.target.id === 'output-length') {
            const input = document.getElementById('input');
            if ((input && input.value) || currentFileData) {
                updateOutput();
            }
        }
    });

    /**
     * 更新输出长度选项
     */
    function updateOutputLengthOptions() {
        const algorithm = getAlgorithm();
        const lengthSelect = document.getElementById('output-length');
        if (!lengthSelect) return;

        const currentValue = parseInt(lengthSelect.value, 10);

        if (algorithm === 'blake2s') {
            lengthSelect.innerHTML = `
                <option value="16">16 (128位)</option>
                <option value="32">32 (256位)</option>
            `;
            if (currentValue > 32) {
                lengthSelect.value = '32';
            } else {
                lengthSelect.value = currentValue.toString();
            }
        } else {
            lengthSelect.innerHTML = `
                <option value="16">16 (128位)</option>
                <option value="32">32 (256位)</option>
                <option value="48">48 (384位)</option>
                <option value="64">64 (512位)</option>
            `;
            lengthSelect.value = currentValue.toString();
        }
    }

    // 事件委托处理器
    document.addEventListener('click', async (e) => {
        if (!isBlake2ToolActive()) return;

        const target = e.target;

        // 哈希按钮
        if (target.id === 'hash-btn' || target.closest('#hash-btn')) {
            updateOutput();
            REOT.utils?.showNotification('哈希计算完成', 'success');
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const input = document.getElementById('input');
            const outputLower = document.getElementById('output-lower');
            const outputUpper = document.getElementById('output-upper');
            const keyInput = document.getElementById('key-input');
            const fileInfo = document.getElementById('file-info');
            const fileInput = document.getElementById('file-input');

            if (input) {
                input.value = '';
                input.disabled = false;
            }
            if (outputLower) outputLower.value = '';
            if (outputUpper) outputUpper.value = '';
            if (keyInput) keyInput.value = '';
            if (fileInfo) fileInfo.style.display = 'none';
            if (fileInput) fileInput.value = '';
            currentFileData = null;
        }

        // 复制按钮
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            const outputLower = document.getElementById('output-lower');
            if (outputLower && outputLower.value) {
                const success = await REOT.utils?.copyToClipboard(outputLower.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }
    });

    // 实时计算
    document.addEventListener('input', (e) => {
        if (!isBlake2ToolActive()) return;

        if (e.target.id === 'input' || e.target.id === 'key-input') {
            updateOutput();
        }
    });

    // 导出工具函数
    window.Blake2Tool = {
        blake2b,
        blake2s,
        calculateHash
    };

    // 设置默认示例数据并计算初始哈希
    const defaultInput = document.getElementById('input');
    if (defaultInput && !defaultInput.value) {
        defaultInput.value = 'Hello, World!';
        setTimeout(updateOutput, 100);
    }

})();
