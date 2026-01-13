/**
 * KDF 密钥派生函数工具
 * @description PBKDF2、bcrypt 密码哈希与密钥派生
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // ==================== bcrypt 库动态加载 ====================

    // bcrypt 库加载状态
    let bcryptLoaded = false;
    let bcryptLoadingPromise = null;

    /**
     * 动态加载 bcrypt 库
     */
    function loadBcryptLibrary() {
        if (bcryptLoaded && typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
            return Promise.resolve();
        }

        if (bcryptLoadingPromise) {
            return bcryptLoadingPromise;
        }

        bcryptLoadingPromise = new Promise((resolve, reject) => {
            // 检查是否已经加载
            if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
                bcryptLoaded = true;
                resolve();
                return;
            }

            // 动态加载脚本
            const script = document.createElement('script');
            const basePath = window.REOT?.router?.pathPrefix || '';
            script.src = `${basePath}/libs/bcrypt/bcrypt.min.js`;
            script.onload = () => {
                bcryptLoaded = true;
                resolve();
            };
            script.onerror = () => {
                bcryptLoadingPromise = null;
                reject(new Error('无法加载 bcrypt 库'));
            };
            document.head.appendChild(script);
        });

        return bcryptLoadingPromise;
    }

    // ==================== PBKDF2 部分 ====================

    // PBKDF2 DOM 元素
    const pbkdf2HashSelect = document.getElementById('pbkdf2-hash');
    const pbkdf2IterationsInput = document.getElementById('pbkdf2-iterations');
    const pbkdf2KeyLengthInput = document.getElementById('pbkdf2-keylength');
    const pbkdf2OutputFormatSelect = document.getElementById('pbkdf2-output-format');
    const pbkdf2PasswordInput = document.getElementById('pbkdf2-password');
    const pbkdf2SaltInput = document.getElementById('pbkdf2-salt');
    const pbkdf2GenSaltBtn = document.getElementById('pbkdf2-gen-salt');
    const pbkdf2DeriveBtn = document.getElementById('pbkdf2-derive-btn');
    const pbkdf2ClearBtn = document.getElementById('pbkdf2-clear-btn');
    const pbkdf2Output = document.getElementById('pbkdf2-output');
    const pbkdf2CopyBtn = document.getElementById('pbkdf2-copy-btn');

    // ==================== bcrypt 部分 ====================

    // bcrypt DOM 元素
    const bcryptCostInput = document.getElementById('bcrypt-cost');
    const bcryptModeSelect = document.getElementById('bcrypt-mode');
    const bcryptPasswordInput = document.getElementById('bcrypt-password');
    const bcryptHashInput = document.getElementById('bcrypt-hash-input');
    const bcryptVerifySection = document.querySelector('.bcrypt-verify-section');
    const bcryptActionBtn = document.getElementById('bcrypt-action-btn');
    const bcryptClearBtn = document.getElementById('bcrypt-clear-btn');
    const bcryptOutput = document.getElementById('bcrypt-output');
    const bcryptCopyBtn = document.getElementById('bcrypt-copy-btn');
    const bcryptAnalysis = document.getElementById('bcrypt-analysis');
    const bcryptVersionDisplay = document.getElementById('bcrypt-version');
    const bcryptCostDisplay = document.getElementById('bcrypt-cost-display');
    const bcryptSaltDisplay = document.getElementById('bcrypt-salt-display');
    const bcryptHashDisplay = document.getElementById('bcrypt-hash-display');

    // 算法标签页切换
    const algorithmTabs = document.querySelectorAll('.algorithm-tab');
    const algorithmPanels = document.querySelectorAll('.algorithm-panel');

    // ==================== 工具函数 ====================

    /**
     * Hex 字符串转 ArrayBuffer
     */
    function hexToBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    }

    /**
     * ArrayBuffer 转 Hex
     */
    function bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * ArrayBuffer 转 Base64
     */
    function bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    }

    /**
     * 生成随机盐值 (Hex 格式)
     */
    function generateSalt(length = 16) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bufferToHex(bytes.buffer);
    }

    /**
     * 验证 Hex 字符串
     */
    function isValidHex(str) {
        return /^[0-9a-fA-F]*$/.test(str) && str.length % 2 === 0;
    }

    // ==================== PBKDF2 实现 ====================

    /**
     * PBKDF2 密钥派生
     */
    async function derivePBKDF2(password, salt, iterations, keyLength, algorithm) {
        const passwordData = new TextEncoder().encode(password);
        const saltData = hexToBuffer(salt);

        // 导入密码作为密钥材料
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordData,
            'PBKDF2',
            false,
            ['deriveBits']
        );

        // 派生密钥
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltData,
                iterations: iterations,
                hash: algorithm
            },
            keyMaterial,
            keyLength * 8
        );

        return derivedBits;
    }

    /**
     * 执行 PBKDF2 密钥派生
     */
    async function executePBKDF2() {
        const password = pbkdf2PasswordInput.value;
        const salt = pbkdf2SaltInput.value.trim();
        const iterations = parseInt(pbkdf2IterationsInput.value, 10);
        const keyLength = parseInt(pbkdf2KeyLengthInput.value, 10);
        const algorithm = pbkdf2HashSelect.value;
        const outputFormat = pbkdf2OutputFormatSelect.value;

        // 验证输入
        if (!password) {
            pbkdf2Output.value = REOT.i18n?.t('tools.kdf.errorNoPassword') || '请输入密码';
            return;
        }

        if (!salt) {
            pbkdf2Output.value = REOT.i18n?.t('tools.kdf.errorNoSalt') || '请输入盐值';
            return;
        }

        if (!isValidHex(salt)) {
            pbkdf2Output.value = REOT.i18n?.t('tools.kdf.errorInvalidSalt') || '盐值必须是有效的 Hex 字符串';
            return;
        }

        if (iterations < 1 || iterations > 10000000) {
            pbkdf2Output.value = REOT.i18n?.t('tools.kdf.errorInvalidIterations') || '迭代次数必须在 1 到 10,000,000 之间';
            return;
        }

        if (keyLength < 1 || keyLength > 512) {
            pbkdf2Output.value = REOT.i18n?.t('tools.kdf.errorInvalidKeyLength') || '密钥长度必须在 1 到 512 字节之间';
            return;
        }

        try {
            pbkdf2Output.value = REOT.i18n?.t('tools.kdf.deriving') || '正在派生密钥...';

            const derivedKey = await derivePBKDF2(password, salt, iterations, keyLength, algorithm);

            if (outputFormat === 'base64') {
                pbkdf2Output.value = bufferToBase64(derivedKey);
            } else {
                pbkdf2Output.value = bufferToHex(derivedKey);
            }
        } catch (error) {
            pbkdf2Output.value = (REOT.i18n?.t('tools.kdf.errorDerivation') || '派生失败: ') + error.message;
        }
    }

    // ==================== bcrypt 实现 ====================

    /**
     * 生成 bcrypt 哈希
     */
    async function generateBcryptHash(password, cost) {
        // 先确保 bcrypt 库已加载
        await loadBcryptLibrary();

        return new Promise((resolve, reject) => {
            if (typeof dcodeIO === 'undefined' || !dcodeIO.bcrypt) {
                reject(new Error('bcrypt 库未加载'));
                return;
            }

            dcodeIO.bcrypt.hash(password, cost, (err, hash) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(hash);
                }
            });
        });
    }

    /**
     * 验证 bcrypt 密码
     */
    async function verifyBcryptPassword(password, hash) {
        // 先确保 bcrypt 库已加载
        await loadBcryptLibrary();

        return new Promise((resolve, reject) => {
            if (typeof dcodeIO === 'undefined' || !dcodeIO.bcrypt) {
                reject(new Error('bcrypt 库未加载'));
                return;
            }

            dcodeIO.bcrypt.compare(password, hash, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * 解析 bcrypt 哈希
     */
    function parseBcryptHash(hash) {
        // bcrypt 哈希格式: $2a$10$N9qo8uLOickgx2ZMRZoMye...
        const regex = /^\$(\d[a-z]?)\$(\d{2})\$(.{22})(.{31})$/;
        const match = hash.match(regex);

        if (!match) {
            return null;
        }

        return {
            version: match[1],
            cost: parseInt(match[2], 10),
            salt: match[3],
            hash: match[4]
        };
    }

    /**
     * 显示 bcrypt 哈希解析结果
     */
    function displayBcryptAnalysis(hash) {
        const parsed = parseBcryptHash(hash);

        if (parsed) {
            bcryptAnalysis.style.display = 'block';
            bcryptVersionDisplay.textContent = '$' + parsed.version + '$';
            bcryptCostDisplay.textContent = parsed.cost + ' (2^' + parsed.cost + ' = ' + Math.pow(2, parsed.cost) + ' iterations)';
            bcryptSaltDisplay.textContent = parsed.salt;
            bcryptHashDisplay.textContent = parsed.hash;
        } else {
            bcryptAnalysis.style.display = 'none';
        }
    }

    /**
     * 执行 bcrypt 操作
     */
    async function executeBcrypt() {
        const password = bcryptPasswordInput.value;
        const mode = bcryptModeSelect.value;
        const cost = parseInt(bcryptCostInput.value, 10);

        if (!password) {
            bcryptOutput.value = REOT.i18n?.t('tools.kdf.errorNoPassword') || '请输入密码';
            return;
        }

        // 验证成本因子
        if (cost < 4 || cost > 31) {
            bcryptOutput.value = REOT.i18n?.t('tools.kdf.errorInvalidCost') || '成本因子必须在 4 到 31 之间';
            return;
        }

        try {
            if (mode === 'hash') {
                bcryptOutput.value = REOT.i18n?.t('tools.kdf.generating') || '正在生成哈希...';

                const hash = await generateBcryptHash(password, cost);
                bcryptOutput.value = hash;
                displayBcryptAnalysis(hash);
            } else {
                // 验证模式
                const hashToVerify = bcryptHashInput.value.trim();

                if (!hashToVerify) {
                    bcryptOutput.value = REOT.i18n?.t('tools.kdf.errorNoHash') || '请输入待验证的哈希';
                    return;
                }

                bcryptOutput.value = REOT.i18n?.t('tools.kdf.verifying') || '正在验证...';

                const isValid = await verifyBcryptPassword(password, hashToVerify);

                if (isValid) {
                    bcryptOutput.value = '✓ ' + (REOT.i18n?.t('tools.kdf.passwordMatch') || '密码匹配');
                    bcryptOutput.style.color = 'var(--success-color, #10b981)';
                } else {
                    bcryptOutput.value = '✗ ' + (REOT.i18n?.t('tools.kdf.passwordMismatch') || '密码不匹配');
                    bcryptOutput.style.color = 'var(--error-color, #ef4444)';
                }

                displayBcryptAnalysis(hashToVerify);
            }
        } catch (error) {
            bcryptOutput.value = (REOT.i18n?.t('tools.kdf.errorOperation') || '操作失败: ') + error.message;
            bcryptOutput.style.color = 'var(--error-color, #ef4444)';
        }
    }

    // ==================== 事件绑定 ====================

    // 算法标签页切换
    algorithmTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const algorithm = tab.dataset.algorithm;

            // 切换标签激活状态
            algorithmTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 切换面板显示
            algorithmPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === algorithm + '-panel') {
                    panel.classList.add('active');
                }
            });
        });
    });

    // PBKDF2 事件
    if (pbkdf2GenSaltBtn) {
        pbkdf2GenSaltBtn.addEventListener('click', () => {
            pbkdf2SaltInput.value = generateSalt(16);
        });
    }

    if (pbkdf2DeriveBtn) {
        pbkdf2DeriveBtn.addEventListener('click', executePBKDF2);
    }

    if (pbkdf2ClearBtn) {
        pbkdf2ClearBtn.addEventListener('click', () => {
            pbkdf2PasswordInput.value = '';
            pbkdf2SaltInput.value = '';
            pbkdf2Output.value = '';
        });
    }

    if (pbkdf2CopyBtn) {
        pbkdf2CopyBtn.addEventListener('click', async () => {
            if (pbkdf2Output.value && !pbkdf2Output.value.startsWith('请') && !pbkdf2Output.value.startsWith('正在')) {
                const success = await REOT.utils?.copyToClipboard(pbkdf2Output.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        });
    }

    // bcrypt 事件
    if (bcryptModeSelect) {
        bcryptModeSelect.addEventListener('change', () => {
            const mode = bcryptModeSelect.value;

            if (mode === 'verify') {
                bcryptVerifySection.style.display = 'block';
                bcryptActionBtn.setAttribute('data-i18n', 'tools.kdf.verify');
                bcryptActionBtn.textContent = REOT.i18n?.t('tools.kdf.verify') || '验证密码';
            } else {
                bcryptVerifySection.style.display = 'none';
                bcryptActionBtn.setAttribute('data-i18n', 'tools.kdf.generateHash');
                bcryptActionBtn.textContent = REOT.i18n?.t('tools.kdf.generateHash') || '生成哈希';
            }

            // 重置输出样式
            bcryptOutput.style.color = '';
            bcryptOutput.value = '';
            bcryptAnalysis.style.display = 'none';
        });
    }

    if (bcryptActionBtn) {
        bcryptActionBtn.addEventListener('click', executeBcrypt);
    }

    if (bcryptClearBtn) {
        bcryptClearBtn.addEventListener('click', () => {
            bcryptPasswordInput.value = '';
            bcryptHashInput.value = '';
            bcryptOutput.value = '';
            bcryptOutput.style.color = '';
            bcryptAnalysis.style.display = 'none';
        });
    }

    if (bcryptCopyBtn) {
        bcryptCopyBtn.addEventListener('click', async () => {
            const output = bcryptOutput.value;
            if (output && !output.startsWith('请') && !output.startsWith('正在') && !output.startsWith('✓') && !output.startsWith('✗')) {
                const success = await REOT.utils?.copyToClipboard(output);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        });
    }

    // ==================== 初始化默认值 ====================

    // 设置默认示例
    if (pbkdf2PasswordInput && !pbkdf2PasswordInput.value) {
        pbkdf2PasswordInput.value = 'password123';
    }
    if (pbkdf2SaltInput && !pbkdf2SaltInput.value) {
        pbkdf2SaltInput.value = generateSalt(16);
    }

    if (bcryptPasswordInput && !bcryptPasswordInput.value) {
        bcryptPasswordInput.value = 'password123';
    }

    // 导出到全局
    window.KDFTool = {
        derivePBKDF2,
        generateBcryptHash,
        verifyBcryptPassword,
        parseBcryptHash,
        loadBcryptLibrary
    };
})();
