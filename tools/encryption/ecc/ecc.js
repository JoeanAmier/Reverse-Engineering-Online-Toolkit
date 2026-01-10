/**
 * ECC 椭圆曲线加密工具
 * @description ECDH 密钥交换与 ECIES 加解密
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // 存储当前密钥对
    let currentKeyPair = null;

    // ========== 工具函数 ==========

    function bytesToHex(bytes) {
        return Array.from(new Uint8Array(bytes))
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
        return bytes.buffer;
    }

    function stringToBytes(str) {
        return new TextEncoder().encode(str);
    }

    function bytesToString(bytes) {
        return new TextDecoder().decode(bytes);
    }

    function concatArrayBuffers(...buffers) {
        const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of buffers) {
            result.set(new Uint8Array(buf), offset);
            offset += buf.byteLength;
        }
        return result.buffer;
    }

    // ========== ECC 核心功能 ==========

    function getCurve() {
        const select = document.getElementById('curve-select');
        return select?.value || 'P-256';
    }

    function getOutputFormat() {
        const select = document.getElementById('output-format');
        return select?.value || 'base64';
    }

    /**
     * 生成 ECDH 密钥对
     */
    async function generateKeyPair() {
        const curve = getCurve();

        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: curve
            },
            true,
            ['deriveBits', 'deriveKey']
        );

        currentKeyPair = keyPair;
        return keyPair;
    }

    /**
     * 导出公钥为 Base64
     */
    async function exportPublicKey(key) {
        const exported = await crypto.subtle.exportKey('spki', key);
        return arrayBufferToBase64(exported);
    }

    /**
     * 导出公钥为 PEM 格式
     */
    async function exportPublicKeyPEM(key) {
        const base64 = await exportPublicKey(key);
        const lines = base64.match(/.{1,64}/g) || [];
        return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
    }

    /**
     * 导出私钥为 Base64
     */
    async function exportPrivateKey(key) {
        const exported = await crypto.subtle.exportKey('pkcs8', key);
        return arrayBufferToBase64(exported);
    }

    /**
     * 导出私钥为 PEM 格式
     */
    async function exportPrivateKeyPEM(key) {
        const base64 = await exportPrivateKey(key);
        const lines = base64.match(/.{1,64}/g) || [];
        return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
    }

    /**
     * 从 PEM/Base64 导入公钥
     */
    async function importPublicKey(keyData) {
        const curve = getCurve();

        // 清理 PEM 格式
        let base64 = keyData
            .replace(/-----BEGIN PUBLIC KEY-----/, '')
            .replace(/-----END PUBLIC KEY-----/, '')
            .replace(/\s/g, '');

        const binaryDer = base64ToArrayBuffer(base64);

        return await crypto.subtle.importKey(
            'spki',
            binaryDer,
            {
                name: 'ECDH',
                namedCurve: curve
            },
            true,
            []
        );
    }

    /**
     * 从 PEM/Base64 导入私钥
     */
    async function importPrivateKey(keyData) {
        const curve = getCurve();

        // 清理 PEM 格式
        let base64 = keyData
            .replace(/-----BEGIN PRIVATE KEY-----/, '')
            .replace(/-----END PRIVATE KEY-----/, '')
            .replace(/\s/g, '');

        const binaryDer = base64ToArrayBuffer(base64);

        return await crypto.subtle.importKey(
            'pkcs8',
            binaryDer,
            {
                name: 'ECDH',
                namedCurve: curve
            },
            true,
            ['deriveBits', 'deriveKey']
        );
    }

    /**
     * ECDH 密钥派生
     */
    async function deriveSharedSecret(privateKey, publicKey) {
        const curve = getCurve();
        const bitLength = curve === 'P-256' ? 256 : curve === 'P-384' ? 384 : 521;

        const sharedBits = await crypto.subtle.deriveBits(
            {
                name: 'ECDH',
                public: publicKey
            },
            privateKey,
            bitLength
        );

        return sharedBits;
    }

    /**
     * 从共享秘密派生 AES 密钥
     */
    async function deriveAESKey(sharedSecret) {
        // 使用 HKDF 派生 AES 密钥
        const sharedKeyMaterial = await crypto.subtle.importKey(
            'raw',
            sharedSecret,
            { name: 'HKDF' },
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: new Uint8Array(32),
                info: stringToBytes('ECIES-AES-GCM')
            },
            sharedKeyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * ECIES 加密
     * 格式: ephemeralPublicKey(variable) + iv(12) + ciphertext + tag(16)
     */
    async function eciesEncrypt(plaintext, recipientPublicKey) {
        const curve = getCurve();

        // 生成临时密钥对
        const ephemeralKeyPair = await crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: curve
            },
            true,
            ['deriveBits']
        );

        // 派生共享秘密
        const sharedSecret = await deriveSharedSecret(ephemeralKeyPair.privateKey, recipientPublicKey);

        // 派生 AES 密钥
        const aesKey = await deriveAESKey(sharedSecret);

        // 生成 IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // 加密
        const ciphertext = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            aesKey,
            typeof plaintext === 'string' ? stringToBytes(plaintext) : plaintext
        );

        // 导出临时公钥
        const ephemeralPublicKey = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);

        // 组装结果: 公钥长度(2字节) + 公钥 + IV + 密文
        const pubKeyLength = new Uint8Array(2);
        pubKeyLength[0] = (ephemeralPublicKey.byteLength >> 8) & 0xFF;
        pubKeyLength[1] = ephemeralPublicKey.byteLength & 0xFF;

        return concatArrayBuffers(
            pubKeyLength.buffer,
            ephemeralPublicKey,
            iv.buffer,
            ciphertext
        );
    }

    /**
     * ECIES 解密
     */
    async function eciesDecrypt(ciphertextBuffer, privateKey) {
        const curve = getCurve();
        const data = new Uint8Array(ciphertextBuffer);

        // 解析公钥长度
        const pubKeyLength = (data[0] << 8) | data[1];
        let offset = 2;

        // 提取临时公钥
        const ephemeralPublicKeyRaw = data.slice(offset, offset + pubKeyLength);
        offset += pubKeyLength;

        // 提取 IV
        const iv = data.slice(offset, offset + 12);
        offset += 12;

        // 提取密文
        const ciphertext = data.slice(offset);

        // 导入临时公钥
        const ephemeralPublicKey = await crypto.subtle.importKey(
            'raw',
            ephemeralPublicKeyRaw,
            {
                name: 'ECDH',
                namedCurve: curve
            },
            true,
            []
        );

        // 派生共享秘密
        const sharedSecret = await deriveSharedSecret(privateKey, ephemeralPublicKey);

        // 派生 AES 密钥
        const aesKey = await deriveAESKey(sharedSecret);

        // 解密
        const plaintext = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            aesKey,
            ciphertext
        );

        return plaintext;
    }

    // ========== UI 功能 ==========

    function isEccToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/encryption/ecc');
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isEccToolActive()) return;

        const target = e.target;

        // 生成密钥对
        if (target.id === 'generate-keys-btn' || target.closest('#generate-keys-btn')) {
            try {
                const keyPair = await generateKeyPair();

                const publicKeyPEM = await exportPublicKeyPEM(keyPair.publicKey);
                const privateKeyPEM = await exportPrivateKeyPEM(keyPair.privateKey);

                const publicKeyEl = document.getElementById('public-key');
                const privateKeyEl = document.getElementById('private-key');

                if (publicKeyEl) publicKeyEl.value = publicKeyPEM;
                if (privateKeyEl) privateKeyEl.value = privateKeyPEM;

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
                const peerKeyEl = document.getElementById('peer-public-key');
                const format = getOutputFormat();

                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入要加密的内容', 'warning');
                    return;
                }

                if (!peerKeyEl?.value.trim()) {
                    REOT.utils?.showNotification('请输入对方公钥', 'warning');
                    return;
                }

                const peerPublicKey = await importPublicKey(peerKeyEl.value);
                const encrypted = await eciesEncrypt(inputEl.value, peerPublicKey);

                if (outputEl) {
                    outputEl.value = format === 'hex'
                        ? bytesToHex(new Uint8Array(encrypted))
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
                    REOT.utils?.showNotification('请先生成或输入私钥', 'warning');
                    return;
                }

                let privateKey;
                if (currentKeyPair) {
                    privateKey = currentKeyPair.privateKey;
                } else {
                    privateKey = await importPrivateKey(privateKeyEl.value);
                }

                let ciphertextBuffer;
                if (format === 'hex') {
                    ciphertextBuffer = hexToBytes(inputEl.value).buffer;
                } else {
                    ciphertextBuffer = base64ToArrayBuffer(inputEl.value);
                }

                const decrypted = await eciesDecrypt(ciphertextBuffer, privateKey);

                if (outputEl) {
                    try {
                        outputEl.value = bytesToString(new Uint8Array(decrypted));
                    } catch (e) {
                        outputEl.value = arrayBufferToBase64(decrypted);
                    }
                }

                REOT.utils?.showNotification('解密成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('解密失败: ' + error.message, 'error');
            }
        }

        // 派生共享密钥
        if (target.id === 'derive-btn' || target.closest('#derive-btn')) {
            try {
                const outputEl = document.getElementById('output');
                const peerKeyEl = document.getElementById('peer-public-key');
                const privateKeyEl = document.getElementById('private-key');
                const format = getOutputFormat();

                if (!peerKeyEl?.value.trim()) {
                    REOT.utils?.showNotification('请输入对方公钥', 'warning');
                    return;
                }

                if (!privateKeyEl?.value.trim() && !currentKeyPair) {
                    REOT.utils?.showNotification('请先生成密钥对', 'warning');
                    return;
                }

                const peerPublicKey = await importPublicKey(peerKeyEl.value);

                let privateKey;
                if (currentKeyPair) {
                    privateKey = currentKeyPair.privateKey;
                } else {
                    privateKey = await importPrivateKey(privateKeyEl.value);
                }

                const sharedSecret = await deriveSharedSecret(privateKey, peerPublicKey);

                if (outputEl) {
                    outputEl.value = format === 'hex'
                        ? bytesToHex(new Uint8Array(sharedSecret))
                        : arrayBufferToBase64(sharedSecret);
                }

                REOT.utils?.showNotification('共享密钥派生成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('密钥派生失败: ' + error.message, 'error');
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
    window.EccTool = {
        generateKeyPair,
        eciesEncrypt,
        eciesDecrypt,
        deriveSharedSecret
    };

    // 设置默认示例数据
    const inputEl = document.getElementById('input');
    if (inputEl && !inputEl.value) {
        inputEl.value = 'Hello, ECC! 你好，椭圆曲线加密！';
    }

})();
