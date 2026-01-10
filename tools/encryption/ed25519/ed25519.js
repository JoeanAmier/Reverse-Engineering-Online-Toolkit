/**
 * Ed25519 签名工具
 * @description Ed25519 数字签名算法，签名与验证
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

    // ========== Ed25519 核心功能 ==========

    /**
     * 生成 Ed25519 密钥对
     */
    async function generateKeyPair() {
        try {
            const keyPair = await crypto.subtle.generateKey(
                { name: 'Ed25519' },
                true,
                ['sign', 'verify']
            );

            currentKeyPair = keyPair;
            return keyPair;
        } catch (error) {
            throw new Error('您的浏览器不支持 Ed25519，请使用最新版本的 Chrome、Edge 或 Firefox');
        }
    }

    /**
     * 导出公钥为 PEM 格式
     */
    async function exportPublicKeyPEM(key) {
        const exported = await crypto.subtle.exportKey('spki', key);
        const base64 = arrayBufferToBase64(exported);
        const lines = base64.match(/.{1,64}/g) || [];
        return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
    }

    /**
     * 导出公钥为 JWK 格式
     */
    async function exportPublicKeyJWK(key) {
        return await crypto.subtle.exportKey('jwk', key);
    }

    /**
     * 导出私钥为 PEM 格式
     */
    async function exportPrivateKeyPEM(key) {
        const exported = await crypto.subtle.exportKey('pkcs8', key);
        const base64 = arrayBufferToBase64(exported);
        const lines = base64.match(/.{1,64}/g) || [];
        return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
    }

    /**
     * 导出私钥为 JWK 格式
     */
    async function exportPrivateKeyJWK(key) {
        return await crypto.subtle.exportKey('jwk', key);
    }

    /**
     * 从 PEM 格式导入公钥
     */
    async function importPublicKeyPEM(pem) {
        const base64 = pem
            .replace(/-----BEGIN PUBLIC KEY-----/, '')
            .replace(/-----END PUBLIC KEY-----/, '')
            .replace(/\s/g, '');

        const binaryDer = base64ToArrayBuffer(base64);

        return await crypto.subtle.importKey(
            'spki',
            binaryDer,
            { name: 'Ed25519' },
            true,
            ['verify']
        );
    }

    /**
     * 从 JWK 格式导入公钥
     */
    async function importPublicKeyJWK(jwk) {
        if (typeof jwk === 'string') {
            jwk = JSON.parse(jwk);
        }
        return await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'Ed25519' },
            true,
            ['verify']
        );
    }

    /**
     * 从 PEM 格式导入私钥
     */
    async function importPrivateKeyPEM(pem) {
        const base64 = pem
            .replace(/-----BEGIN PRIVATE KEY-----/, '')
            .replace(/-----END PRIVATE KEY-----/, '')
            .replace(/\s/g, '');

        const binaryDer = base64ToArrayBuffer(base64);

        return await crypto.subtle.importKey(
            'pkcs8',
            binaryDer,
            { name: 'Ed25519' },
            true,
            ['sign']
        );
    }

    /**
     * 从 JWK 格式导入私钥
     */
    async function importPrivateKeyJWK(jwk) {
        if (typeof jwk === 'string') {
            jwk = JSON.parse(jwk);
        }
        return await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'Ed25519' },
            true,
            ['sign']
        );
    }

    /**
     * 签名
     */
    async function sign(message, privateKey) {
        if (typeof message === 'string') {
            message = stringToBytes(message);
        }

        const signature = await crypto.subtle.sign(
            { name: 'Ed25519' },
            privateKey,
            message
        );

        return new Uint8Array(signature);
    }

    /**
     * 验证签名
     */
    async function verify(message, signature, publicKey) {
        if (typeof message === 'string') {
            message = stringToBytes(message);
        }

        if (!(signature instanceof ArrayBuffer)) {
            signature = signature.buffer || new Uint8Array(signature).buffer;
        }

        return await crypto.subtle.verify(
            { name: 'Ed25519' },
            publicKey,
            signature,
            message
        );
    }

    // ========== UI 功能 ==========

    function getKeyFormat() {
        const select = document.getElementById('key-format');
        return select?.value || 'pem';
    }

    function getOutputFormat() {
        const select = document.getElementById('output-format');
        return select?.value || 'base64';
    }

    function showResult(valid) {
        const resultSection = document.getElementById('result-section');
        const resultBox = document.getElementById('result-box');
        const resultIcon = document.getElementById('result-icon');
        const resultText = document.getElementById('result-text');

        if (resultSection && resultBox && resultIcon && resultText) {
            resultSection.style.display = 'block';

            if (valid) {
                resultBox.className = 'result-box result-box--success';
                resultIcon.textContent = '\u2713';
                resultText.textContent = REOT.i18n?.t('tools.ed25519.validSignature') || '签名验证成功';
            } else {
                resultBox.className = 'result-box result-box--error';
                resultIcon.textContent = '\u2717';
                resultText.textContent = REOT.i18n?.t('tools.ed25519.invalidSignature') || '签名验证失败';
            }
        }
    }

    function hideResult() {
        const resultSection = document.getElementById('result-section');
        if (resultSection) {
            resultSection.style.display = 'none';
        }
    }

    function isEd25519ToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/encryption/ed25519');
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isEd25519ToolActive()) return;

        const target = e.target;

        // 生成密钥对
        if (target.id === 'generate-keys-btn' || target.closest('#generate-keys-btn')) {
            try {
                const keyFormat = getKeyFormat();
                const keyPair = await generateKeyPair();

                const publicKeyEl = document.getElementById('public-key');
                const privateKeyEl = document.getElementById('private-key');

                if (keyFormat === 'jwk') {
                    const publicJwk = await exportPublicKeyJWK(keyPair.publicKey);
                    const privateJwk = await exportPrivateKeyJWK(keyPair.privateKey);

                    if (publicKeyEl) publicKeyEl.value = JSON.stringify(publicJwk, null, 2);
                    if (privateKeyEl) privateKeyEl.value = JSON.stringify(privateJwk, null, 2);
                } else {
                    const publicPem = await exportPublicKeyPEM(keyPair.publicKey);
                    const privatePem = await exportPrivateKeyPEM(keyPair.privateKey);

                    if (publicKeyEl) publicKeyEl.value = publicPem;
                    if (privateKeyEl) privateKeyEl.value = privatePem;
                }

                hideResult();
                REOT.utils?.showNotification('密钥对生成成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 签名
        if (target.id === 'sign-btn' || target.closest('#sign-btn')) {
            try {
                const inputEl = document.getElementById('input');
                const outputEl = document.getElementById('output');
                const privateKeyEl = document.getElementById('private-key');
                const keyFormat = getKeyFormat();
                const outputFormat = getOutputFormat();

                if (!inputEl?.value) {
                    REOT.utils?.showNotification('请输入要签名的消息', 'warning');
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
                    if (keyFormat === 'jwk') {
                        privateKey = await importPrivateKeyJWK(privateKeyEl.value);
                    } else {
                        privateKey = await importPrivateKeyPEM(privateKeyEl.value);
                    }
                }

                const signature = await sign(inputEl.value, privateKey);

                if (outputEl) {
                    outputEl.value = outputFormat === 'hex'
                        ? bytesToHex(signature)
                        : arrayBufferToBase64(signature.buffer);
                }

                hideResult();
                REOT.utils?.showNotification('签名成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('签名失败: ' + error.message, 'error');
            }
        }

        // 验证签名
        if (target.id === 'verify-btn' || target.closest('#verify-btn')) {
            try {
                const inputEl = document.getElementById('input');
                const outputEl = document.getElementById('output');
                const publicKeyEl = document.getElementById('public-key');
                const keyFormat = getKeyFormat();
                const outputFormat = getOutputFormat();

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

                let publicKey;
                if (currentKeyPair) {
                    publicKey = currentKeyPair.publicKey;
                } else {
                    if (keyFormat === 'jwk') {
                        publicKey = await importPublicKeyJWK(publicKeyEl.value);
                    } else {
                        publicKey = await importPublicKeyPEM(publicKeyEl.value);
                    }
                }

                let signature;
                if (outputFormat === 'hex') {
                    signature = hexToBytes(outputEl.value);
                } else {
                    signature = new Uint8Array(base64ToArrayBuffer(outputEl.value));
                }

                const valid = await verify(inputEl.value, signature, publicKey);

                showResult(valid);

                if (valid) {
                    REOT.utils?.showNotification('签名验证成功', 'success');
                } else {
                    REOT.utils?.showNotification('签名验证失败', 'error');
                }
            } catch (error) {
                showResult(false);
                REOT.utils?.showNotification('验证失败: ' + error.message, 'error');
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

        // 清除
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl) inputEl.value = '';
            if (outputEl) outputEl.value = '';
            hideResult();
        }

        // 复制签名
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

    // 密钥格式切换时重新生成密钥对提示
    document.addEventListener('change', (e) => {
        if (!isEd25519ToolActive()) return;

        if (e.target.id === 'key-format') {
            const publicKeyEl = document.getElementById('public-key');
            const privateKeyEl = document.getElementById('private-key');

            if (publicKeyEl) publicKeyEl.value = '';
            if (privateKeyEl) privateKeyEl.value = '';
            currentKeyPair = null;

            hideResult();
        }
    });

    // 导出
    window.Ed25519Tool = {
        generateKeyPair,
        sign,
        verify
    };

    // 设置默认示例数据
    const inputEl = document.getElementById('input');
    if (inputEl && !inputEl.value) {
        inputEl.value = 'Hello, Ed25519! 你好，Ed25519签名算法！';
    }

})();
