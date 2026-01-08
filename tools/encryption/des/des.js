/**
 * DES/3DES 加解密工具
 * @description DES 和 Triple DES 对称加密与解密
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let cryptoJsLoadPromise = null;

    /**
     * 动态加载 CryptoJS 库
     */
    function loadCryptoJS() {
        if (cryptoJsLoadPromise) {
            return cryptoJsLoadPromise;
        }

        if (window.CryptoJS) {
            return Promise.resolve();
        }

        cryptoJsLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js';

            script.onload = () => {
                const checkGlobal = () => {
                    if (window.CryptoJS) {
                        resolve();
                    } else {
                        setTimeout(checkGlobal, 10);
                    }
                };
                checkGlobal();
            };

            script.onerror = () => {
                cryptoJsLoadPromise = null;
                reject(new Error('无法加载 CryptoJS 库'));
            };

            document.head.appendChild(script);
        });

        return cryptoJsLoadPromise;
    }

    /**
     * 确保库已加载
     */
    async function ensureLibraryLoaded() {
        if (!window.CryptoJS) {
            await loadCryptoJS();
        }
        if (!window.CryptoJS) {
            throw new Error('CryptoJS 库加载失败');
        }
    }

    /**
     * 检查当前是否在 DES 工具页面
     */
    function isDesToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/encryption/des');
    }

    /**
     * 生成随机字节并转为 Hex
     */
    function generateRandomHex(length) {
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 获取密钥长度
     */
    function getKeyLength() {
        const algorithm = document.getElementById('algorithm-select')?.value;
        return algorithm === '3DES' ? 24 : 8;  // 3DES: 24 bytes, DES: 8 bytes
    }

    /**
     * 更新密钥提示
     */
    function updateKeyHint() {
        const algorithm = document.getElementById('algorithm-select')?.value;
        const keyHint = document.getElementById('key-hint');

        if (keyHint) {
            if (algorithm === '3DES') {
                keyHint.setAttribute('data-i18n', 'tools.des.keyHint3DES');
                keyHint.textContent = '3DES 需要 24 字节密钥';
            } else {
                keyHint.setAttribute('data-i18n', 'tools.des.keyHintDES');
                keyHint.textContent = 'DES 需要 8 字节密钥';
            }

            if (window.REOT?.i18n?.updateElement) {
                window.REOT.i18n.updateElement(keyHint);
            }
        }
    }

    /**
     * 更新 IV 行可见性
     */
    function updateIvVisibility() {
        const mode = document.getElementById('mode-select')?.value;
        const ivRow = document.getElementById('iv-row');

        if (ivRow) {
            ivRow.style.display = mode === 'ECB' ? 'none' : 'block';
        }
    }

    /**
     * 解析密钥 (支持 Hex 或文本)
     */
    function parseKey(keyStr, targetLength) {
        keyStr = keyStr.trim();

        // 如果是有效的 Hex 字符串且长度匹配
        if (/^[0-9a-fA-F]+$/.test(keyStr) && keyStr.length === targetLength * 2) {
            return CryptoJS.enc.Hex.parse(keyStr);
        }

        // 否则作为 UTF-8 字符串处理
        const utf8Bytes = CryptoJS.enc.Utf8.parse(keyStr);
        const wordArray = CryptoJS.lib.WordArray.create();

        // 填充或截断到目标长度
        const bytes = [];
        const utf8String = utf8Bytes.toString(CryptoJS.enc.Hex);
        for (let i = 0; i < targetLength; i++) {
            const idx = (i * 2) % utf8String.length;
            if (idx + 2 <= utf8String.length) {
                bytes.push(utf8String.substr(idx, 2));
            } else {
                bytes.push('00');
            }
        }

        return CryptoJS.enc.Hex.parse(bytes.join(''));
    }

    /**
     * 解析 IV (支持 Hex 或文本)
     */
    function parseIv(ivStr) {
        return parseKey(ivStr, 8);  // DES/3DES block size is 8 bytes
    }

    /**
     * 获取 CryptoJS 配置
     */
    function getCryptoConfig() {
        const algorithm = document.getElementById('algorithm-select')?.value;
        const mode = document.getElementById('mode-select')?.value;
        const padding = document.getElementById('padding-select')?.value;

        const modeMap = {
            'CBC': CryptoJS.mode.CBC,
            'ECB': CryptoJS.mode.ECB
        };

        const paddingMap = {
            'Pkcs7': CryptoJS.pad.Pkcs7,
            'ZeroPadding': CryptoJS.pad.ZeroPadding,
            'NoPadding': CryptoJS.pad.NoPadding
        };

        return {
            algorithm,
            mode: modeMap[mode],
            padding: paddingMap[padding],
            needsIv: mode !== 'ECB'
        };
    }

    /**
     * DES/3DES 加密
     */
    async function encrypt(plaintext) {
        await ensureLibraryLoaded();

        const config = getCryptoConfig();
        const keyLength = getKeyLength();

        const keyInput = document.getElementById('key-input')?.value || '';
        const ivInput = document.getElementById('iv-input')?.value || '';
        const outputFormat = document.getElementById('output-format')?.value || 'base64';

        if (!keyInput.trim()) {
            throw new Error('请输入密钥');
        }

        const key = parseKey(keyInput, keyLength);

        const options = {
            mode: config.mode,
            padding: config.padding
        };

        if (config.needsIv) {
            if (!ivInput.trim()) {
                throw new Error('请输入 IV 向量');
            }
            options.iv = parseIv(ivInput);
        }

        let encrypted;
        if (config.algorithm === '3DES') {
            encrypted = CryptoJS.TripleDES.encrypt(plaintext, key, options);
        } else {
            encrypted = CryptoJS.DES.encrypt(plaintext, key, options);
        }

        if (outputFormat === 'hex') {
            return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
        } else {
            return encrypted.toString();  // Base64 by default
        }
    }

    /**
     * DES/3DES 解密
     */
    async function decrypt(ciphertext) {
        await ensureLibraryLoaded();

        const config = getCryptoConfig();
        const keyLength = getKeyLength();

        const keyInput = document.getElementById('key-input')?.value || '';
        const ivInput = document.getElementById('iv-input')?.value || '';
        const outputFormat = document.getElementById('output-format')?.value || 'base64';

        if (!keyInput.trim()) {
            throw new Error('请输入密钥');
        }

        const key = parseKey(keyInput, keyLength);

        const options = {
            mode: config.mode,
            padding: config.padding
        };

        if (config.needsIv) {
            if (!ivInput.trim()) {
                throw new Error('请输入 IV 向量');
            }
            options.iv = parseIv(ivInput);
        }

        // 处理输入格式
        let ciphertextParam;
        if (outputFormat === 'hex') {
            ciphertextParam = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Hex.parse(ciphertext)
            });
        } else {
            ciphertextParam = ciphertext;  // Base64 string
        }

        let decrypted;
        if (config.algorithm === '3DES') {
            decrypted = CryptoJS.TripleDES.decrypt(ciphertextParam, key, options);
        } else {
            decrypted = CryptoJS.DES.decrypt(ciphertextParam, key, options);
        }

        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result) {
            throw new Error('解密失败，请检查密钥和 IV');
        }

        return result;
    }

    // 事件处理
    document.addEventListener('change', (e) => {
        if (!isDesToolActive()) return;

        if (e.target.id === 'algorithm-select') {
            updateKeyHint();
        }

        if (e.target.id === 'mode-select') {
            updateIvVisibility();
        }
    });

    document.addEventListener('click', async (e) => {
        if (!isDesToolActive()) return;

        const target = e.target;

        // 生成密钥
        if (target.id === 'generate-key-btn' || target.closest('#generate-key-btn')) {
            const keyInput = document.getElementById('key-input');
            const keyLength = getKeyLength();
            if (keyInput) {
                keyInput.value = generateRandomHex(keyLength);
            }
        }

        // 生成 IV
        if (target.id === 'generate-iv-btn' || target.closest('#generate-iv-btn')) {
            const ivInput = document.getElementById('iv-input');
            if (ivInput) {
                ivInput.value = generateRandomHex(8);
            }
        }

        // 加密按钮
        if (target.id === 'encrypt-btn' || target.closest('#encrypt-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');

            if (!inputEl?.value) {
                REOT.utils?.showNotification('请输入要加密的内容', 'warning');
                return;
            }

            try {
                const result = await encrypt(inputEl.value);
                if (outputEl) outputEl.value = result;
                REOT.utils?.showNotification('加密成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
                if (outputEl) outputEl.value = '错误: ' + error.message;
            }
        }

        // 解密按钮
        if (target.id === 'decrypt-btn' || target.closest('#decrypt-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');

            if (!inputEl?.value) {
                REOT.utils?.showNotification('请输入要解密的内容', 'warning');
                return;
            }

            try {
                const result = await decrypt(inputEl.value);
                if (outputEl) outputEl.value = result;
                REOT.utils?.showNotification('解密成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('解密失败: ' + error.message, 'error');
                if (outputEl) outputEl.value = '错误: ' + error.message;
            }
        }

        // 交换按钮
        if (target.id === 'swap-btn' || target.closest('#swap-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl && outputEl) {
                const temp = inputEl.value;
                inputEl.value = outputEl.value;
                outputEl.value = temp;
            }
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const inputEl = document.getElementById('input');
            const outputEl = document.getElementById('output');
            if (inputEl) inputEl.value = '';
            if (outputEl) outputEl.value = '';
        }

        // 复制按钮
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

    // 初始化
    function init() {
        updateKeyHint();
        updateIvVisibility();

        // 设置默认示例数据
        const inputEl = document.getElementById('input');
        const keyInput = document.getElementById('key-input');
        const ivInput = document.getElementById('iv-input');

        if (inputEl && !inputEl.value) {
            inputEl.value = 'Hello, DES/3DES Encryption! 你好，DES 加密！';
        }
        if (keyInput && !keyInput.value) {
            keyInput.value = '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';  // 24 bytes hex for 3DES
        }
        if (ivInput && !ivInput.value) {
            ivInput.value = '0011223344556677';  // 8 bytes hex
        }
    }

    // 预加载 CryptoJS
    loadCryptoJS().catch(err => console.warn('CryptoJS 预加载失败:', err.message));

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 导出工具函数
    window.DESTool = { encrypt, decrypt };

})();
