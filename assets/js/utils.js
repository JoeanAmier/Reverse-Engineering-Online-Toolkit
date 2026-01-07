/**
 * REOT - Utility Functions
 * 工具函数库
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // 全局命名空间
    window.REOT = window.REOT || {};

    /**
     * 工具函数集合
     */
    REOT.utils = {
        /**
         * 复制文本到剪贴板
         * @param {string} text - 要复制的文本
         * @returns {Promise<boolean>} - 复制是否成功
         */
        async copyToClipboard(text) {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    return true;
                }
                // 降级方案
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
            } catch (error) {
                console.error('复制失败:', error);
                return false;
            }
        },

        /**
         * 从剪贴板读取文本
         * @returns {Promise<string>} - 剪贴板中的文本
         */
        async readFromClipboard() {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    return await navigator.clipboard.readText();
                }
                return '';
            } catch (error) {
                console.error('读取剪贴板失败:', error);
                return '';
            }
        },

        /**
         * 下载文件
         * @param {string} content - 文件内容
         * @param {string} filename - 文件名
         * @param {string} mimeType - MIME类型
         */
        downloadFile(content, filename, mimeType = 'text/plain') {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        /**
         * 读取文件内容
         * @param {File} file - 文件对象
         * @param {string} readAs - 读取方式: 'text' | 'arrayBuffer' | 'dataURL'
         * @returns {Promise<string|ArrayBuffer>} - 文件内容
         */
        readFile(file, readAs = 'text') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);

                switch (readAs) {
                case 'text':
                    reader.readAsText(file);
                    break;
                case 'arrayBuffer':
                    reader.readAsArrayBuffer(file);
                    break;
                case 'dataURL':
                    reader.readAsDataURL(file);
                    break;
                default:
                    reader.readAsText(file);
                }
            });
        },

        /**
         * 防抖函数
         * @param {Function} func - 要防抖的函数
         * @param {number} wait - 等待时间（毫秒）
         * @returns {Function} - 防抖后的函数
         */
        debounce(func, wait = 300) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func.apply(this, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * 节流函数
         * @param {Function} func - 要节流的函数
         * @param {number} limit - 时间限制（毫秒）
         * @returns {Function} - 节流后的函数
         */
        throttle(func, limit = 300) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => (inThrottle = false), limit);
                }
            };
        },

        /**
         * 格式化字节大小
         * @param {number} bytes - 字节数
         * @param {number} decimals - 小数位数
         * @returns {string} - 格式化后的字符串
         */
        formatBytes(bytes, decimals = 2) {
            if (bytes === 0) {
                return '0 Bytes';
            }
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        },

        /**
         * 生成唯一ID
         * @param {string} prefix - ID前缀
         * @returns {string} - 唯一ID
         */
        generateId(prefix = 'id') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        },

        /**
         * 深拷贝对象
         * @param {*} obj - 要拷贝的对象
         * @returns {*} - 拷贝后的对象
         */
        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            if (obj instanceof Date) {
                return new Date(obj.getTime());
            }
            if (obj instanceof Array) {
                return obj.map(item => this.deepClone(item));
            }
            if (obj instanceof Object) {
                const copy = {};
                Object.keys(obj).forEach(key => {
                    copy[key] = this.deepClone(obj[key]);
                });
                return copy;
            }
            return obj;
        },

        /**
         * 检查是否是有效的十六进制字符串
         * @param {string} str - 输入字符串
         * @returns {boolean} - 是否有效
         */
        isValidHex(str) {
            return /^[0-9A-Fa-f]+$/.test(str);
        },

        /**
         * 检查是否是有效的Base64字符串
         * @param {string} str - 输入字符串
         * @returns {boolean} - 是否有效
         */
        isValidBase64(str) {
            try {
                return btoa(atob(str)) === str;
            } catch (e) {
                return false;
            }
        },

        /**
         * 字符串转十六进制
         * @param {string} str - 输入字符串
         * @returns {string} - 十六进制字符串
         */
        stringToHex(str) {
            let hex = '';
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i);
                hex += charCode.toString(16).padStart(2, '0');
            }
            return hex;
        },

        /**
         * 十六进制转字符串
         * @param {string} hex - 十六进制字符串
         * @returns {string} - 原始字符串
         */
        hexToString(hex) {
            let str = '';
            for (let i = 0; i < hex.length; i += 2) {
                str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }
            return str;
        },

        /**
         * ArrayBuffer 转十六进制字符串
         * @param {ArrayBuffer} buffer - ArrayBuffer
         * @returns {string} - 十六进制字符串
         */
        arrayBufferToHex(buffer) {
            return Array.from(new Uint8Array(buffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        },

        /**
         * 十六进制字符串转 ArrayBuffer
         * @param {string} hex - 十六进制字符串
         * @returns {ArrayBuffer} - ArrayBuffer
         */
        hexToArrayBuffer(hex) {
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
            }
            return bytes.buffer;
        },

        /**
         * 字符串转 Uint8Array (UTF-8)
         * @param {string} str - 输入字符串
         * @returns {Uint8Array} - Uint8Array
         */
        stringToUint8Array(str) {
            return new TextEncoder().encode(str);
        },

        /**
         * Uint8Array 转字符串 (UTF-8)
         * @param {Uint8Array} array - Uint8Array
         * @returns {string} - 字符串
         */
        uint8ArrayToString(array) {
            return new TextDecoder().decode(array);
        },

        /**
         * 显示通知消息
         * @param {string} message - 消息内容
         * @param {string} type - 消息类型: 'success' | 'error' | 'warning' | 'info'
         * @param {number} duration - 显示时长（毫秒）
         */
        showNotification(message, type = 'info', duration = 3000) {
            const notification = document.createElement('div');
            notification.className = `notification notification--${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 12px 24px;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                z-index: 9999;
                animation: slideIn 0.3s ease;
                background-color: ${type === 'success' ? '#22c55e' :
        type === 'error' ? '#ef4444' :
            type === 'warning' ? '#f59e0b' : '#3b82f6'};
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        },

        /**
         * 转义HTML特殊字符
         * @param {string} str - 输入字符串
         * @returns {string} - 转义后的字符串
         */
        escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * 反转义HTML特殊字符
         * @param {string} str - 转义后的字符串
         * @returns {string} - 原始字符串
         */
        unescapeHtml(str) {
            const div = document.createElement('div');
            div.innerHTML = str;
            return div.textContent;
        },

        /**
         * 获取URL查询参数
         * @param {string} name - 参数名
         * @returns {string|null} - 参数值
         */
        getQueryParam(name) {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        },

        /**
         * 设置URL查询参数
         * @param {string} name - 参数名
         * @param {string} value - 参数值
         */
        setQueryParam(name, value) {
            const url = new URL(window.location.href);
            url.searchParams.set(name, value);
            window.history.replaceState({}, '', url);
        },

        /**
         * 本地存储封装
         */
        storage: {
            get(key, defaultValue = null) {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : defaultValue;
                } catch (e) {
                    return defaultValue;
                }
            },
            set(key, value) {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (e) {
                    return false;
                }
            },
            remove(key) {
                localStorage.removeItem(key);
            },
            clear() {
                localStorage.clear();
            }
        }
    };

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

})();
