/**
 * ChaCha20 加解密工具
 * @description ChaCha20 流加密算法
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * ChaCha20 核心实现
     * 基于 RFC 7539 规范
     */
    class ChaCha20 {
        constructor(key, nonce, counter = 0) {
            if (key.length !== 32) {
                throw new Error('密钥必须是 32 字节');
            }
            if (nonce.length !== 12) {
                throw new Error('Nonce 必须是 12 字节');
            }

            this.key = key;
            this.nonce = nonce;
            this.counter = counter;
        }

        /**
         * Quarter Round 操作
         */
        static quarterRound(state, a, b, c, d) {
            state[a] = (state[a] + state[b]) >>> 0;
            state[d] = ChaCha20.rotl32(state[d] ^ state[a], 16);
            state[c] = (state[c] + state[d]) >>> 0;
            state[b] = ChaCha20.rotl32(state[b] ^ state[c], 12);
            state[a] = (state[a] + state[b]) >>> 0;
            state[d] = ChaCha20.rotl32(state[d] ^ state[a], 8);
            state[c] = (state[c] + state[d]) >>> 0;
            state[b] = ChaCha20.rotl32(state[b] ^ state[c], 7);
        }

        /**
         * 32位左旋转
         */
        static rotl32(v, n) {
            return ((v << n) | (v >>> (32 - n))) >>> 0;
        }

        /**
         * 小端序读取 32 位整数
         */
        static littleEndian32(data, offset) {
            return (data[offset] |
                    (data[offset + 1] << 8) |
                    (data[offset + 2] << 16) |
                    (data[offset + 3] << 24)) >>> 0;
        }

        /**
         * 小端序写入 32 位整数
         */
        static storeLittleEndian32(data, offset, value) {
            data[offset] = value & 0xff;
            data[offset + 1] = (value >>> 8) & 0xff;
            data[offset + 2] = (value >>> 16) & 0xff;
            data[offset + 3] = (value >>> 24) & 0xff;
        }

        /**
         * 生成 ChaCha20 块
         */
        generateBlock(counter) {
            // 初始化状态
            // "expand 32-byte k"
            const state = new Uint32Array([
                0x61707865, 0x3320646e, 0x79622d32, 0x6b206574,
                ChaCha20.littleEndian32(this.key, 0),
                ChaCha20.littleEndian32(this.key, 4),
                ChaCha20.littleEndian32(this.key, 8),
                ChaCha20.littleEndian32(this.key, 12),
                ChaCha20.littleEndian32(this.key, 16),
                ChaCha20.littleEndian32(this.key, 20),
                ChaCha20.littleEndian32(this.key, 24),
                ChaCha20.littleEndian32(this.key, 28),
                counter >>> 0,
                ChaCha20.littleEndian32(this.nonce, 0),
                ChaCha20.littleEndian32(this.nonce, 4),
                ChaCha20.littleEndian32(this.nonce, 8)
            ]);

            const working = new Uint32Array(state);

            // 20 轮 (10 次双轮)
            for (let i = 0; i < 10; i++) {
                // 列轮
                ChaCha20.quarterRound(working, 0, 4, 8, 12);
                ChaCha20.quarterRound(working, 1, 5, 9, 13);
                ChaCha20.quarterRound(working, 2, 6, 10, 14);
                ChaCha20.quarterRound(working, 3, 7, 11, 15);
                // 对角线轮
                ChaCha20.quarterRound(working, 0, 5, 10, 15);
                ChaCha20.quarterRound(working, 1, 6, 11, 12);
                ChaCha20.quarterRound(working, 2, 7, 8, 13);
                ChaCha20.quarterRound(working, 3, 4, 9, 14);
            }

            // 加上初始状态
            for (let i = 0; i < 16; i++) {
                working[i] = (working[i] + state[i]) >>> 0;
            }

            // 转换为字节
            const output = new Uint8Array(64);
            for (let i = 0; i < 16; i++) {
                ChaCha20.storeLittleEndian32(output, i * 4, working[i]);
            }

            return output;
        }

        /**
         * 加密/解密 (XOR 操作，加密和解密相同)
         */
        process(data) {
            const output = new Uint8Array(data.length);
            let counter = this.counter;

            for (let i = 0; i < data.length; i += 64) {
                const block = this.generateBlock(counter++);
                const chunkSize = Math.min(64, data.length - i);

                for (let j = 0; j < chunkSize; j++) {
                    output[i + j] = data[i + j] ^ block[j];
                }
            }

            return output;
        }
    }

    /**
     * Poly1305 MAC 实现
     * 用于 ChaCha20-Poly1305 AEAD
     */
    class Poly1305 {
        constructor(key) {
            if (key.length !== 32) {
                throw new Error('Poly1305 密钥必须是 32 字节');
            }

            // 解析 r 和 s
            this.r = this.clamp(key.slice(0, 16));
            this.s = key.slice(16, 32);
            this.acc = [0, 0, 0, 0, 0];
        }

        clamp(r) {
            const clamped = new Uint8Array(r);
            clamped[3] &= 0x0f;
            clamped[7] &= 0x0f;
            clamped[11] &= 0x0f;
            clamped[15] &= 0x0f;
            clamped[4] &= 0xfc;
            clamped[8] &= 0xfc;
            clamped[12] &= 0xfc;
            return clamped;
        }

        update(data) {
            // 简化的 Poly1305 实现
            // 注意：这是简化版，实际生产环境应使用完整实现
            for (let i = 0; i < data.length; i += 16) {
                const chunk = data.slice(i, Math.min(i + 16, data.length));
                this.processBlock(chunk, i + 16 <= data.length);
            }
        }

        processBlock(block, full) {
            // 简化处理，将块转换为数值进行计算
            let n = BigInt(0);
            for (let i = block.length - 1; i >= 0; i--) {
                n = (n << 8n) | BigInt(block[i]);
            }
            if (full) {
                n |= (1n << BigInt(block.length * 8));
            }

            // 累加
            let acc = BigInt(0);
            for (let i = 4; i >= 0; i--) {
                acc = (acc << 26n) | BigInt(this.acc[i]);
            }
            acc += n;

            // 乘以 r
            let r = BigInt(0);
            for (let i = this.r.length - 1; i >= 0; i--) {
                r = (r << 8n) | BigInt(this.r[i]);
            }

            acc = (acc * r) % ((1n << 130n) - 5n);

            // 存回
            for (let i = 0; i < 5; i++) {
                this.acc[i] = Number(acc & 0x3ffffffn);
                acc >>= 26n;
            }
        }

        finish() {
            // 最终化
            let acc = BigInt(0);
            for (let i = 4; i >= 0; i--) {
                acc = (acc << 26n) | BigInt(this.acc[i]);
            }

            // 加上 s
            let s = BigInt(0);
            for (let i = this.s.length - 1; i >= 0; i--) {
                s = (s << 8n) | BigInt(this.s[i]);
            }

            acc = (acc + s) & ((1n << 128n) - 1n);

            // 转换为字节
            const tag = new Uint8Array(16);
            for (let i = 0; i < 16; i++) {
                tag[i] = Number(acc & 0xffn);
                acc >>= 8n;
            }

            return tag;
        }
    }

    /**
     * ChaCha20-Poly1305 AEAD
     */
    class ChaCha20Poly1305 {
        constructor(key) {
            if (key.length !== 32) {
                throw new Error('密钥必须是 32 字节');
            }
            this.key = key;
        }

        encrypt(nonce, plaintext, aad = new Uint8Array(0)) {
            // 生成 Poly1305 密钥
            const chacha = new ChaCha20(this.key, nonce, 0);
            const polyKey = chacha.generateBlock(0).slice(0, 32);

            // 加密明文 (从 counter = 1 开始)
            const chachaEnc = new ChaCha20(this.key, nonce, 1);
            const ciphertext = chachaEnc.process(plaintext);

            // 计算认证标签
            const poly = new Poly1305(polyKey);
            poly.update(this.pad16(aad));
            poly.update(this.pad16(ciphertext));
            poly.update(this.lengthBytes(aad.length, ciphertext.length));
            const tag = poly.finish();

            // 返回密文 + 标签
            const result = new Uint8Array(ciphertext.length + 16);
            result.set(ciphertext);
            result.set(tag, ciphertext.length);

            return result;
        }

        decrypt(nonce, ciphertext, aad = new Uint8Array(0)) {
            if (ciphertext.length < 16) {
                throw new Error('密文太短');
            }

            const actualCiphertext = ciphertext.slice(0, -16);
            const tag = ciphertext.slice(-16);

            // 生成 Poly1305 密钥
            const chacha = new ChaCha20(this.key, nonce, 0);
            const polyKey = chacha.generateBlock(0).slice(0, 32);

            // 验证标签
            const poly = new Poly1305(polyKey);
            poly.update(this.pad16(aad));
            poly.update(this.pad16(actualCiphertext));
            poly.update(this.lengthBytes(aad.length, actualCiphertext.length));
            const expectedTag = poly.finish();

            // 常量时间比较
            let diff = 0;
            for (let i = 0; i < 16; i++) {
                diff |= tag[i] ^ expectedTag[i];
            }
            if (diff !== 0) {
                throw new Error('认证失败：标签不匹配');
            }

            // 解密
            const chachaDec = new ChaCha20(this.key, nonce, 1);
            return chachaDec.process(actualCiphertext);
        }

        pad16(data) {
            const padLen = (16 - (data.length % 16)) % 16;
            if (padLen === 0) return data;
            const padded = new Uint8Array(data.length + padLen);
            padded.set(data);
            return padded;
        }

        lengthBytes(aadLen, ciphertextLen) {
            const result = new Uint8Array(16);
            // 小端序存储长度
            let n = aadLen;
            for (let i = 0; i < 8; i++) {
                result[i] = n & 0xff;
                n >>>= 8;
            }
            n = ciphertextLen;
            for (let i = 8; i < 16; i++) {
                result[i] = n & 0xff;
                n >>>= 8;
            }
            return result;
        }
    }

    // ========== 工具函数 ==========

    /**
     * 字节数组转 Hex 字符串
     */
    function bytesToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Hex 字符串转字节数组
     */
    function hexToBytes(hex) {
        hex = hex.replace(/\s/g, '');
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    /**
     * 字符串转字节数组
     */
    function stringToBytes(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * 字节数组转字符串
     */
    function bytesToString(bytes) {
        return new TextDecoder().decode(bytes);
    }

    /**
     * Base64 编码
     */
    function bytesToBase64(bytes) {
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    }

    /**
     * Base64 解码
     */
    function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * 生成随机字节
     */
    function generateRandomBytes(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * 获取密钥字节 (32 字节)
     */
    function getKeyBytes() {
        const keyInput = document.getElementById('key-input');
        const keyStr = keyInput?.value.trim() || '';

        if (/^[0-9a-fA-F]+$/.test(keyStr) && keyStr.length === 64) {
            return hexToBytes(keyStr);
        }

        const keyBytes = stringToBytes(keyStr);
        const result = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            result[i] = keyBytes[i % keyBytes.length] || 0;
        }
        return result;
    }

    /**
     * 获取 Nonce 字节 (12 字节)
     */
    function getNonceBytes() {
        const nonceInput = document.getElementById('nonce-input');
        const nonceStr = nonceInput?.value.trim() || '';

        if (/^[0-9a-fA-F]+$/.test(nonceStr) && nonceStr.length === 24) {
            return hexToBytes(nonceStr);
        }

        const nonceBytes = stringToBytes(nonceStr);
        const result = new Uint8Array(12);
        for (let i = 0; i < 12; i++) {
            result[i] = nonceBytes[i % nonceBytes.length] || 0;
        }
        return result;
    }

    /**
     * 获取计数器
     */
    function getCounter() {
        const counterInput = document.getElementById('counter-input');
        return parseInt(counterInput?.value || '0', 10);
    }

    /**
     * 获取变体
     */
    function getVariant() {
        const variantSelect = document.getElementById('variant-select');
        return variantSelect?.value || 'chacha20';
    }

    /**
     * 获取输出格式
     */
    function getOutputFormat() {
        const formatSelect = document.getElementById('output-format');
        return formatSelect?.value || 'base64';
    }

    /**
     * 加密
     */
    function encrypt(plaintext) {
        const key = getKeyBytes();
        const nonce = getNonceBytes();
        const counter = getCounter();
        const variant = getVariant();
        const format = getOutputFormat();

        const plaintextBytes = stringToBytes(plaintext);
        let result;

        if (variant === 'chacha20-poly1305') {
            const aead = new ChaCha20Poly1305(key);
            result = aead.encrypt(nonce, plaintextBytes);
        } else {
            const chacha = new ChaCha20(key, nonce, counter);
            result = chacha.process(plaintextBytes);
        }

        return format === 'hex' ? bytesToHex(result) : bytesToBase64(result);
    }

    /**
     * 解密
     */
    function decrypt(ciphertext) {
        const key = getKeyBytes();
        const nonce = getNonceBytes();
        const counter = getCounter();
        const variant = getVariant();
        const format = getOutputFormat();

        let ciphertextBytes;
        if (format === 'hex') {
            ciphertextBytes = hexToBytes(ciphertext);
        } else {
            ciphertextBytes = base64ToBytes(ciphertext);
        }

        let result;

        if (variant === 'chacha20-poly1305') {
            const aead = new ChaCha20Poly1305(key);
            result = aead.decrypt(nonce, ciphertextBytes);
        } else {
            const chacha = new ChaCha20(key, nonce, counter);
            result = chacha.process(ciphertextBytes);
        }

        return bytesToString(result);
    }

    // ========== 检查当前页面 ==========

    function isChaCha20ToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/encryption/chacha20');
    }

    // ========== 事件处理 ==========

    document.addEventListener('click', async (e) => {
        if (!isChaCha20ToolActive()) return;

        const target = e.target;
        const inputEl = document.getElementById('input');
        const outputEl = document.getElementById('output');
        const keyInput = document.getElementById('key-input');
        const nonceInput = document.getElementById('nonce-input');

        // 生成密钥
        if (target.id === 'generate-key-btn' || target.closest('#generate-key-btn')) {
            const keyBytes = generateRandomBytes(32);
            if (keyInput) keyInput.value = bytesToHex(keyBytes);
        }

        // 生成 Nonce
        if (target.id === 'generate-nonce-btn' || target.closest('#generate-nonce-btn')) {
            const nonceBytes = generateRandomBytes(12);
            if (nonceInput) nonceInput.value = bytesToHex(nonceBytes);
        }

        // 加密
        if (target.id === 'encrypt-btn' || target.closest('#encrypt-btn')) {
            try {
                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入要加密的内容', 'warning');
                    return;
                }
                if (!keyInput?.value.trim()) {
                    REOT.utils?.showNotification('请输入密钥', 'warning');
                    return;
                }
                if (!nonceInput?.value.trim()) {
                    REOT.utils?.showNotification('请输入 Nonce', 'warning');
                    return;
                }

                const result = encrypt(inputEl.value);
                if (outputEl) outputEl.value = result;
                REOT.utils?.showNotification('加密成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('加密失败: ' + error.message, 'error');
                if (outputEl) outputEl.value = '错误: ' + error.message;
            }
        }

        // 解密
        if (target.id === 'decrypt-btn' || target.closest('#decrypt-btn')) {
            try {
                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入要解密的内容', 'warning');
                    return;
                }
                if (!keyInput?.value.trim()) {
                    REOT.utils?.showNotification('请输入密钥', 'warning');
                    return;
                }
                if (!nonceInput?.value.trim()) {
                    REOT.utils?.showNotification('请输入 Nonce', 'warning');
                    return;
                }

                const result = decrypt(inputEl.value);
                if (outputEl) outputEl.value = result;
                REOT.utils?.showNotification('解密成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('解密失败: ' + error.message, 'error');
                if (outputEl) outputEl.value = '错误: ' + error.message;
            }
        }

        // 交换
        if (target.id === 'swap-btn' || target.closest('#swap-btn')) {
            if (inputEl && outputEl) {
                const temp = inputEl.value;
                inputEl.value = outputEl.value;
                outputEl.value = temp;
            }
        }

        // 清除
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            if (inputEl) inputEl.value = '';
            if (outputEl) outputEl.value = '';
        }

        // 复制
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            if (outputEl?.value) {
                const success = await REOT.utils?.copyToClipboard(outputEl.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }
    });

    // 变体切换时更新 UI
    document.addEventListener('change', (e) => {
        if (!isChaCha20ToolActive()) return;

        if (e.target.id === 'variant-select') {
            const counterRow = document.getElementById('counter-row');
            if (counterRow) {
                counterRow.style.display = e.target.value === 'chacha20' ? 'block' : 'none';
            }
        }
    });

    // 导出到全局
    window.ChaCha20Tool = {
        ChaCha20,
        ChaCha20Poly1305,
        encrypt,
        decrypt
    };

    // 设置默认示例数据
    const inputEl = document.getElementById('input');
    const keyInput = document.getElementById('key-input');
    const nonceInput = document.getElementById('nonce-input');

    if (inputEl && !inputEl.value) {
        inputEl.value = 'Hello, ChaCha20! 你好，ChaCha20 加密！';
    }
    if (keyInput && !keyInput.value) {
        keyInput.value = 'my-super-secret-key-32bytes!';
    }
    if (nonceInput && !nonceInput.value) {
        nonceInput.value = 'unique-nonce';
    }

})();
