/**
 * UUID 生成器工具
 * @description 生成各种版本的 UUID
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    const outputEl = document.getElementById('output');
    const generateBtnEl = document.getElementById('generate-btn');
    const clearBtnEl = document.getElementById('clear-btn');
    const copyBtnEl = document.getElementById('copy-btn');
    const versionSelectEl = document.getElementById('version-select');
    const countInputEl = document.getElementById('count-input');
    const uppercaseEl = document.getElementById('uppercase');
    const noDashesEl = document.getElementById('no-dashes');

    /**
     * 生成 UUID v4 (随机)
     * @returns {string}
     */
    function generateUUIDv4() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }

        // 降级实现
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 生成 UUID v1 (时间戳)
     * @returns {string}
     */
    function generateUUIDv1() {
        const now = Date.now();
        const uuid = 'xxxxxxxx-xxxx-1xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c, i) {
            const r = (now + Math.random() * 16) % 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return uuid;
    }

    /**
     * 生成 UUID
     * @param {string} version - UUID 版本
     * @returns {string}
     */
    function generateUUID(version) {
        switch (version) {
        case '1':
            return generateUUIDv1();
        case '4':
        default:
            return generateUUIDv4();
        }
    }

    /**
     * 生成多个 UUID
     * @param {Object} options - 选项
     * @returns {string[]}
     */
    function generateMultiple(options = {}) {
        const {
            version = '4',
            count = 1,
            uppercase = false,
            noDashes = false
        } = options;

        const uuids = [];
        for (let i = 0; i < count; i++) {
            let uuid = generateUUID(version);

            if (noDashes) {
                uuid = uuid.replace(/-/g, '');
            }

            if (uppercase) {
                uuid = uuid.toUpperCase();
            }

            uuids.push(uuid);
        }

        return uuids;
    }

    if (generateBtnEl) {
        generateBtnEl.addEventListener('click', () => {
            const options = {
                version: versionSelectEl ? versionSelectEl.value : '4',
                count: countInputEl ? Math.min(Math.max(parseInt(countInputEl.value, 10) || 1, 1), 100) : 1,
                uppercase: uppercaseEl ? uppercaseEl.checked : false,
                noDashes: noDashesEl ? noDashesEl.checked : false
            };

            const uuids = generateMultiple(options);
            outputEl.value = uuids.join('\n');
        });
    }

    if (clearBtnEl) {
        clearBtnEl.addEventListener('click', () => {
            outputEl.value = '';
        });
    }

    if (copyBtnEl) {
        copyBtnEl.addEventListener('click', async () => {
            const success = await REOT.utils?.copyToClipboard(outputEl.value);
            if (success) {
                REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
            }
        });
    }

    // 页面加载时自动生成一个
    if (outputEl) {
        outputEl.value = generateUUIDv4();
    }

    window.UUIDTool = {
        generateUUID,
        generateUUIDv1,
        generateUUIDv4,
        generateMultiple
    };
})();
