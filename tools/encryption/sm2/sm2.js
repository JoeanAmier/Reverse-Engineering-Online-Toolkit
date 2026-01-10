/**
 * SM2 国密加解密工具
 * @description 国密 SM2 椭圆曲线加解密与签名验签
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // ========== SM2 椭圆曲线参数 ==========
    // 使用 sm2p256v1 曲线

    const SM2_PARAMS = {
        // 素数 p
        p: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF'),
        // 系数 a
        a: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC'),
        // 系数 b
        b: BigInt('0x28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93'),
        // 阶 n
        n: BigInt('0xFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123'),
        // 基点 G
        Gx: BigInt('0x32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7'),
        Gy: BigInt('0xBC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0')
    };

    // ========== 大数运算工具 ==========

    function mod(a, m) {
        return ((a % m) + m) % m;
    }

    function modInverse(a, m) {
        a = mod(a, m);
        let [old_r, r] = [m, a];
        let [old_s, s] = [0n, 1n];

        while (r !== 0n) {
            const q = old_r / r;
            [old_r, r] = [r, old_r - q * r];
            [old_s, s] = [s, old_s - q * s];
        }

        return mod(old_s, m);
    }

    function modPow(base, exp, m) {
        let result = 1n;
        base = mod(base, m);

        while (exp > 0n) {
            if (exp % 2n === 1n) {
                result = mod(result * base, m);
            }
            exp = exp / 2n;
            base = mod(base * base, m);
        }

        return result;
    }

    // ========== 椭圆曲线点运算 ==========

    class ECPoint {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        static infinity() {
            return new ECPoint(null, null);
        }

        isInfinity() {
            return this.x === null && this.y === null;
        }

        equals(other) {
            if (this.isInfinity() && other.isInfinity()) return true;
            if (this.isInfinity() || other.isInfinity()) return false;
            return this.x === other.x && this.y === other.y;
        }

        negate() {
            if (this.isInfinity()) return ECPoint.infinity();
            return new ECPoint(this.x, mod(-this.y, SM2_PARAMS.p));
        }

        // 点加法
        add(other) {
            if (this.isInfinity()) return other;
            if (other.isInfinity()) return this;

            const p = SM2_PARAMS.p;

            if (this.x === other.x) {
                if (mod(this.y + other.y, p) === 0n) {
                    return ECPoint.infinity();
                }
                return this.double();
            }

            const lambda = mod((other.y - this.y) * modInverse(other.x - this.x, p), p);
            const x3 = mod(lambda * lambda - this.x - other.x, p);
            const y3 = mod(lambda * (this.x - x3) - this.y, p);

            return new ECPoint(x3, y3);
        }

        // 点倍乘
        double() {
            if (this.isInfinity()) return ECPoint.infinity();
            if (this.y === 0n) return ECPoint.infinity();

            const p = SM2_PARAMS.p;
            const a = SM2_PARAMS.a;

            const lambda = mod((3n * this.x * this.x + a) * modInverse(2n * this.y, p), p);
            const x3 = mod(lambda * lambda - 2n * this.x, p);
            const y3 = mod(lambda * (this.x - x3) - this.y, p);

            return new ECPoint(x3, y3);
        }

        // 标量乘法
        multiply(k) {
            if (k === 0n) return ECPoint.infinity();

            let result = ECPoint.infinity();
            let addend = this;

            while (k > 0n) {
                if (k % 2n === 1n) {
                    result = result.add(addend);
                }
                addend = addend.double();
                k = k / 2n;
            }

            return result;
        }
    }

    // 基点 G
    const G = new ECPoint(SM2_PARAMS.Gx, SM2_PARAMS.Gy);

    // ========== SM3 哈希实现 ==========

    const SM3_IV = [
        0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
        0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e
    ];

    const SM3_T = [
        0x79cc4519, 0x7a879d8a
    ];

    function rotl32(x, n) {
        return ((x << n) | (x >>> (32 - n))) >>> 0;
    }

    function ff(j, x, y, z) {
        if (j < 16) {
            return (x ^ y ^ z) >>> 0;
        }
        return ((x & y) | (x & z) | (y & z)) >>> 0;
    }

    function gg(j, x, y, z) {
        if (j < 16) {
            return (x ^ y ^ z) >>> 0;
        }
        return ((x & y) | (~x & z)) >>> 0;
    }

    function p0(x) {
        return (x ^ rotl32(x, 9) ^ rotl32(x, 17)) >>> 0;
    }

    function p1(x) {
        return (x ^ rotl32(x, 15) ^ rotl32(x, 23)) >>> 0;
    }

    function sm3Compress(v, b) {
        const w = new Array(68);
        const w1 = new Array(64);

        // 消息扩展
        for (let i = 0; i < 16; i++) {
            w[i] = (b[i * 4] << 24) | (b[i * 4 + 1] << 16) | (b[i * 4 + 2] << 8) | b[i * 4 + 3];
        }

        for (let i = 16; i < 68; i++) {
            w[i] = (p1(w[i - 16] ^ w[i - 9] ^ rotl32(w[i - 3], 15)) ^ rotl32(w[i - 13], 7) ^ w[i - 6]) >>> 0;
        }

        for (let i = 0; i < 64; i++) {
            w1[i] = (w[i] ^ w[i + 4]) >>> 0;
        }

        // 压缩函数
        let [a, bb, c, d, e, f, g, h] = v;

        for (let j = 0; j < 64; j++) {
            const t = j < 16 ? SM3_T[0] : SM3_T[1];
            const ss1 = rotl32((rotl32(a, 12) + e + rotl32(t, j % 32)) >>> 0, 7);
            const ss2 = (ss1 ^ rotl32(a, 12)) >>> 0;
            const tt1 = (ff(j, a, bb, c) + d + ss2 + w1[j]) >>> 0;
            const tt2 = (gg(j, e, f, g) + h + ss1 + w[j]) >>> 0;
            d = c;
            c = rotl32(bb, 9);
            bb = a;
            a = tt1;
            h = g;
            g = rotl32(f, 19);
            f = e;
            e = p0(tt2);
        }

        return [
            (a ^ v[0]) >>> 0, (bb ^ v[1]) >>> 0, (c ^ v[2]) >>> 0, (d ^ v[3]) >>> 0,
            (e ^ v[4]) >>> 0, (f ^ v[5]) >>> 0, (g ^ v[6]) >>> 0, (h ^ v[7]) >>> 0
        ];
    }

    function sm3(message) {
        if (typeof message === 'string') {
            message = new TextEncoder().encode(message);
        }

        const msgLen = message.length;
        const bitLen = BigInt(msgLen) * 8n;

        // 填充
        const padLen = (56 - (msgLen + 1) % 64 + 64) % 64;
        const padded = new Uint8Array(msgLen + 1 + padLen + 8);
        padded.set(message);
        padded[msgLen] = 0x80;

        // 添加长度
        for (let i = 0; i < 8; i++) {
            padded[padded.length - 8 + i] = Number((bitLen >> BigInt((7 - i) * 8)) & 0xffn);
        }

        // 分块处理
        let v = [...SM3_IV];
        for (let i = 0; i < padded.length; i += 64) {
            const block = padded.slice(i, i + 64);
            v = sm3Compress(v, block);
        }

        // 输出
        const hash = new Uint8Array(32);
        for (let i = 0; i < 8; i++) {
            hash[i * 4] = (v[i] >>> 24) & 0xff;
            hash[i * 4 + 1] = (v[i] >>> 16) & 0xff;
            hash[i * 4 + 2] = (v[i] >>> 8) & 0xff;
            hash[i * 4 + 3] = v[i] & 0xff;
        }

        return hash;
    }

    // ========== SM2 核心功能 ==========

    function generateKeyPair() {
        // 生成随机私钥 d (1 < d < n-1)
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);

        let d = bytesToBigInt(randomBytes);
        d = mod(d, SM2_PARAMS.n - 2n) + 1n;

        // 计算公钥 P = d * G
        const P = G.multiply(d);

        return {
            privateKey: d,
            publicKey: P
        };
    }

    function sm2Encrypt(message, publicKey) {
        if (typeof message === 'string') {
            message = new TextEncoder().encode(message);
        }

        const n = SM2_PARAMS.n;

        // 生成随机数 k
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        let k = bytesToBigInt(randomBytes);
        k = mod(k, n - 1n) + 1n;

        // C1 = k * G
        const C1 = G.multiply(k);

        // S = k * P (共享点)
        const S = publicKey.multiply(k);

        // 生成密钥派生函数输入
        const x2 = bigIntToBytes(S.x, 32);
        const y2 = bigIntToBytes(S.y, 32);

        // KDF
        const t = kdf(new Uint8Array([...x2, ...y2]), message.length);

        // C2 = M XOR t
        const C2 = new Uint8Array(message.length);
        for (let i = 0; i < message.length; i++) {
            C2[i] = message[i] ^ t[i];
        }

        // C3 = SM3(x2 || M || y2)
        const C3 = sm3(new Uint8Array([...x2, ...message, ...y2]));

        // 输出: C1 || C3 || C2 (新标准格式)
        const x1 = bigIntToBytes(C1.x, 32);
        const y1 = bigIntToBytes(C1.y, 32);

        return new Uint8Array([0x04, ...x1, ...y1, ...C3, ...C2]);
    }

    function sm2Decrypt(ciphertext, privateKey) {
        if (ciphertext[0] !== 0x04) {
            throw new Error('无效的密文格式');
        }

        // 解析 C1
        const x1 = bytesToBigInt(ciphertext.slice(1, 33));
        const y1 = bytesToBigInt(ciphertext.slice(33, 65));
        const C1 = new ECPoint(x1, y1);

        // C3 (32字节)
        const C3 = ciphertext.slice(65, 97);

        // C2
        const C2 = ciphertext.slice(97);

        // S = d * C1
        const S = C1.multiply(privateKey);

        // KDF
        const x2 = bigIntToBytes(S.x, 32);
        const y2 = bigIntToBytes(S.y, 32);
        const t = kdf(new Uint8Array([...x2, ...y2]), C2.length);

        // M = C2 XOR t
        const M = new Uint8Array(C2.length);
        for (let i = 0; i < C2.length; i++) {
            M[i] = C2[i] ^ t[i];
        }

        // 验证 C3
        const C3Check = sm3(new Uint8Array([...x2, ...M, ...y2]));
        for (let i = 0; i < 32; i++) {
            if (C3[i] !== C3Check[i]) {
                throw new Error('密文验证失败');
            }
        }

        return M;
    }

    function sm2Sign(message, privateKey, userId = '1234567812345678') {
        if (typeof message === 'string') {
            message = new TextEncoder().encode(message);
        }
        if (typeof userId === 'string') {
            userId = new TextEncoder().encode(userId);
        }

        const n = SM2_PARAMS.n;
        const d = privateKey;

        // 计算公钥
        const P = G.multiply(d);

        // 计算 ZA
        const ZA = computeZA(userId, P);

        // e = SM3(ZA || M)
        const e = bytesToBigInt(sm3(new Uint8Array([...ZA, ...message])));

        let r, s;
        do {
            // 生成随机数 k
            const randomBytes = new Uint8Array(32);
            crypto.getRandomValues(randomBytes);
            let k = bytesToBigInt(randomBytes);
            k = mod(k, n - 1n) + 1n;

            // (x1, y1) = k * G
            const kG = G.multiply(k);

            // r = (e + x1) mod n
            r = mod(e + kG.x, n);

            if (r === 0n || r + k === n) continue;

            // s = ((1 + d)^-1 * (k - r * d)) mod n
            s = mod(modInverse(1n + d, n) * (k - r * d), n);
        } while (s === 0n);

        return {
            r: bigIntToBytes(r, 32),
            s: bigIntToBytes(s, 32)
        };
    }

    function sm2Verify(message, signature, publicKey, userId = '1234567812345678') {
        if (typeof message === 'string') {
            message = new TextEncoder().encode(message);
        }
        if (typeof userId === 'string') {
            userId = new TextEncoder().encode(userId);
        }

        const n = SM2_PARAMS.n;
        const r = bytesToBigInt(signature.r);
        const s = bytesToBigInt(signature.s);

        // 验证 r, s 范围
        if (r < 1n || r >= n || s < 1n || s >= n) {
            return false;
        }

        // 计算 ZA
        const ZA = computeZA(userId, publicKey);

        // e = SM3(ZA || M)
        const e = bytesToBigInt(sm3(new Uint8Array([...ZA, ...message])));

        // t = (r + s) mod n
        const t = mod(r + s, n);
        if (t === 0n) return false;

        // (x1, y1) = s * G + t * P
        const sG = G.multiply(s);
        const tP = publicKey.multiply(t);
        const point = sG.add(tP);

        // R = (e + x1) mod n
        const R = mod(e + point.x, n);

        return R === r;
    }

    function computeZA(userId, publicKey) {
        const entla = userId.length * 8;
        const a = bigIntToBytes(SM2_PARAMS.a, 32);
        const b = bigIntToBytes(SM2_PARAMS.b, 32);
        const xG = bigIntToBytes(SM2_PARAMS.Gx, 32);
        const yG = bigIntToBytes(SM2_PARAMS.Gy, 32);
        const xA = bigIntToBytes(publicKey.x, 32);
        const yA = bigIntToBytes(publicKey.y, 32);

        const data = new Uint8Array([
            (entla >> 8) & 0xff,
            entla & 0xff,
            ...userId,
            ...a,
            ...b,
            ...xG,
            ...yG,
            ...xA,
            ...yA
        ]);

        return sm3(data);
    }

    function kdf(z, keyLen) {
        const ct = 1;
        const result = new Uint8Array(keyLen);
        let offset = 0;

        for (let i = 1; offset < keyLen; i++) {
            const ctBytes = new Uint8Array([
                (i >> 24) & 0xff,
                (i >> 16) & 0xff,
                (i >> 8) & 0xff,
                i & 0xff
            ]);

            const hash = sm3(new Uint8Array([...z, ...ctBytes]));
            const copyLen = Math.min(32, keyLen - offset);
            result.set(hash.slice(0, copyLen), offset);
            offset += copyLen;
        }

        return result;
    }

    // ========== 工具函数 ==========

    function bytesToBigInt(bytes) {
        let result = 0n;
        for (let i = 0; i < bytes.length; i++) {
            result = (result << 8n) | BigInt(bytes[i]);
        }
        return result;
    }

    function bigIntToBytes(n, length) {
        const bytes = new Uint8Array(length);
        for (let i = length - 1; i >= 0; i--) {
            bytes[i] = Number(n & 0xffn);
            n = n >> 8n;
        }
        return bytes;
    }

    function bytesToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function hexToBytes(hex) {
        hex = hex.replace(/\s/g, '');
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function getOutputFormat() {
        const select = document.getElementById('output-format');
        return select?.value || 'base64';
    }

    function getMode() {
        const select = document.getElementById('mode-select');
        return select?.value || 'encrypt';
    }

    function parsePublicKey(str) {
        str = str.trim().replace(/\s/g, '');
        if (str.startsWith('04')) {
            const bytes = hexToBytes(str);
            const x = bytesToBigInt(bytes.slice(1, 33));
            const y = bytesToBigInt(bytes.slice(33, 65));
            return new ECPoint(x, y);
        }
        throw new Error('无效的公钥格式');
    }

    function parsePrivateKey(str) {
        str = str.trim().replace(/\s/g, '');
        return bytesToBigInt(hexToBytes(str));
    }

    function formatPublicKey(point) {
        const x = bigIntToBytes(point.x, 32);
        const y = bigIntToBytes(point.y, 32);
        return '04' + bytesToHex(x) + bytesToHex(y);
    }

    function formatPrivateKey(d) {
        return bytesToHex(bigIntToBytes(d, 32));
    }

    // ========== UI 功能 ==========

    function isSm2ToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/encryption/sm2');
    }

    // 模式切换
    document.addEventListener('change', (e) => {
        if (!isSm2ToolActive()) return;

        if (e.target.id === 'mode-select') {
            const mode = e.target.value;
            const encryptBtn = document.getElementById('encrypt-btn');
            const decryptBtn = document.getElementById('decrypt-btn');
            const signBtn = document.getElementById('sign-btn');
            const verifyBtn = document.getElementById('verify-btn');
            const useridSection = document.getElementById('userid-section');

            if (mode === 'encrypt') {
                if (encryptBtn) encryptBtn.style.display = '';
                if (decryptBtn) decryptBtn.style.display = '';
                if (signBtn) signBtn.style.display = 'none';
                if (verifyBtn) verifyBtn.style.display = 'none';
                if (useridSection) useridSection.style.display = 'none';
            } else {
                if (encryptBtn) encryptBtn.style.display = 'none';
                if (decryptBtn) decryptBtn.style.display = 'none';
                if (signBtn) signBtn.style.display = '';
                if (verifyBtn) verifyBtn.style.display = '';
                if (useridSection) useridSection.style.display = '';
            }
        }
    });

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isSm2ToolActive()) return;

        const target = e.target;

        // 生成密钥对
        if (target.id === 'generate-keys-btn' || target.closest('#generate-keys-btn')) {
            try {
                const keyPair = generateKeyPair();

                const publicKeyEl = document.getElementById('public-key');
                const privateKeyEl = document.getElementById('private-key');

                if (publicKeyEl) publicKeyEl.value = formatPublicKey(keyPair.publicKey);
                if (privateKeyEl) privateKeyEl.value = formatPrivateKey(keyPair.privateKey);

                REOT.utils?.showNotification('密钥对生成成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('密钥生成失败: ' + error.message, 'error');
            }
        }

        // 加密
        if (target.id === 'encrypt-btn' || target.closest('#encrypt-btn')) {
            try {
                const inputEl = document.getElementById('input');
                const outputEl = document.getElementById('output');
                const publicKeyEl = document.getElementById('public-key');
                const format = getOutputFormat();

                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入要加密的内容', 'warning');
                    return;
                }

                if (!publicKeyEl?.value.trim()) {
                    REOT.utils?.showNotification('请输入公钥', 'warning');
                    return;
                }

                const publicKey = parsePublicKey(publicKeyEl.value);
                const encrypted = sm2Encrypt(inputEl.value, publicKey);

                if (outputEl) {
                    outputEl.value = format === 'hex'
                        ? bytesToHex(encrypted)
                        : arrayBufferToBase64(encrypted);
                }

                REOT.utils?.showNotification('加密成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('加密失败: ' + error.message, 'error');
            }
        }

        // 解密
        if (target.id === 'decrypt-btn' || target.closest('#decrypt-btn')) {
            try {
                const inputEl = document.getElementById('input');
                const outputEl = document.getElementById('output');
                const privateKeyEl = document.getElementById('private-key');
                const format = getOutputFormat();

                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入要解密的内容', 'warning');
                    return;
                }

                if (!privateKeyEl?.value.trim()) {
                    REOT.utils?.showNotification('请输入私钥', 'warning');
                    return;
                }

                const privateKey = parsePrivateKey(privateKeyEl.value);
                let ciphertext;
                if (format === 'hex') {
                    ciphertext = hexToBytes(inputEl.value);
                } else {
                    ciphertext = base64ToArrayBuffer(inputEl.value);
                }

                const decrypted = sm2Decrypt(ciphertext, privateKey);

                if (outputEl) {
                    try {
                        outputEl.value = new TextDecoder().decode(decrypted);
                    } catch (e) {
                        outputEl.value = arrayBufferToBase64(decrypted);
                    }
                }

                REOT.utils?.showNotification('解密成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('解密失败: ' + error.message, 'error');
            }
        }

        // 签名
        if (target.id === 'sign-btn' || target.closest('#sign-btn')) {
            try {
                const inputEl = document.getElementById('input');
                const outputEl = document.getElementById('output');
                const privateKeyEl = document.getElementById('private-key');
                const userIdEl = document.getElementById('user-id');
                const format = getOutputFormat();

                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入要签名的内容', 'warning');
                    return;
                }

                if (!privateKeyEl?.value.trim()) {
                    REOT.utils?.showNotification('请输入私钥', 'warning');
                    return;
                }

                const privateKey = parsePrivateKey(privateKeyEl.value);
                const userId = userIdEl?.value || '1234567812345678';
                const signature = sm2Sign(inputEl.value, privateKey, userId);

                const sigBytes = new Uint8Array([...signature.r, ...signature.s]);

                if (outputEl) {
                    outputEl.value = format === 'hex'
                        ? bytesToHex(sigBytes)
                        : arrayBufferToBase64(sigBytes);
                }

                REOT.utils?.showNotification('签名成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('签名失败: ' + error.message, 'error');
            }
        }

        // 验签
        if (target.id === 'verify-btn' || target.closest('#verify-btn')) {
            try {
                const inputEl = document.getElementById('input');
                const outputEl = document.getElementById('output');
                const publicKeyEl = document.getElementById('public-key');
                const userIdEl = document.getElementById('user-id');
                const format = getOutputFormat();

                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入原始消息', 'warning');
                    return;
                }

                if (!outputEl?.value) {
                    REOT.utils?.showNotification('请输入签名', 'warning');
                    return;
                }

                if (!publicKeyEl?.value.trim()) {
                    REOT.utils?.showNotification('请输入公钥', 'warning');
                    return;
                }

                const publicKey = parsePublicKey(publicKeyEl.value);
                const userId = userIdEl?.value || '1234567812345678';

                let sigBytes;
                if (format === 'hex') {
                    sigBytes = hexToBytes(outputEl.value);
                } else {
                    sigBytes = base64ToArrayBuffer(outputEl.value);
                }

                const signature = {
                    r: sigBytes.slice(0, 32),
                    s: sigBytes.slice(32, 64)
                };

                const valid = sm2Verify(inputEl.value, signature, publicKey, userId);

                if (valid) {
                    REOT.utils?.showNotification('签名验证成功', 'success');
                    outputEl.value = '验证结果: 签名有效';
                } else {
                    REOT.utils?.showNotification('签名验证失败', 'error');
                    outputEl.value = '验证结果: 签名无效';
                }
            } catch (error) {
                REOT.utils?.showNotification('验签失败: ' + error.message, 'error');
            }
        }

        // 复制公钥
        if (target.id === 'copy-public-btn' || target.closest('#copy-public-btn')) {
            const publicKeyEl = document.getElementById('public-key');
            if (publicKeyEl?.value) {
                const success = await REOT.utils?.copyToClipboard(publicKeyEl.value);
                if (success) {
                    REOT.utils?.showNotification('公钥已复制', 'success');
                }
            }
        }

        // 复制私钥
        if (target.id === 'copy-private-btn' || target.closest('#copy-private-btn')) {
            const privateKeyEl = document.getElementById('private-key');
            if (privateKeyEl?.value) {
                const success = await REOT.utils?.copyToClipboard(privateKeyEl.value);
                if (success) {
                    REOT.utils?.showNotification('私钥已复制', 'success');
                }
            }
        }

        // 交换
        if (target.id === 'swap-btn' || target.closest('#swap-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl && outputEl) {
                const temp = inputEl.value;
                inputEl.value = outputEl.value;
                outputEl.value = temp;
            }
        }

        // 清除
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl) inputEl.value = '';
            if (outputEl) outputEl.value = '';
        }

        // 复制结果
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            const outputEl = document.getElementById('output');
            if (outputEl?.value) {
                const success = await REOT.utils?.copyToClipboard(outputEl.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }
    });

    // 导出
    window.Sm2Tool = {
        generateKeyPair,
        encrypt: sm2Encrypt,
        decrypt: sm2Decrypt,
        sign: sm2Sign,
        verify: sm2Verify,
        sm3
    };

    // 设置默认示例数据
    const inputEl = document.getElementById('input');
    if (inputEl && !inputEl.value) {
        inputEl.value = 'Hello, SM2! 你好，国密SM2算法！';
    }

})();
