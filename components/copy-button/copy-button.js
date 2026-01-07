/**
 * REOT - Copy Button Component
 * 复制按钮组件
 */

(function() {
    'use strict';

    window.REOT = window.REOT || {};
    REOT.components = REOT.components || {};

    REOT.components.copyButton = {
        /**
         * 创建复制按钮
         * @param {Object} options - 配置选项
         * @returns {HTMLElement} - 按钮元素
         */
        create(options = {}) {
            const {
                targetId,
                getText,
                className = 'copy-btn btn btn--outline',
                successText = '已复制',
                failText = '复制失败'
            } = options;

            const button = document.createElement('button');
            button.className = className;
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span data-i18n="common.copy">复制</span>
            `;

            button.addEventListener('click', async () => {
                let text = '';

                if (getText && typeof getText === 'function') {
                    text = getText();
                } else if (targetId) {
                    const target = document.getElementById(targetId);
                    text = target?.value || target?.textContent || '';
                }

                const success = await REOT.utils.copyToClipboard(text);

                if (success) {
                    this.showFeedback(button, successText, 'success');
                    REOT.utils.showNotification(REOT.i18n?.t('common.copied') || successText, 'success');
                } else {
                    this.showFeedback(button, failText, 'error');
                    REOT.utils.showNotification(REOT.i18n?.t('common.copyFailed') || failText, 'error');
                }
            });

            return button;
        },

        /**
         * 显示反馈效果
         * @param {HTMLElement} button - 按钮元素
         * @param {string} text - 提示文本
         * @param {string} type - 类型 success/error
         */
        showFeedback(button, text, type) {
            button.classList.add('copied');
            button.setAttribute('data-copied-text', text);

            setTimeout(() => {
                button.classList.remove('copied');
            }, 2000);
        },

        /**
         * 初始化页面上所有复制按钮
         */
        initAll() {
            document.querySelectorAll('[data-copy-target]').forEach(button => {
                const targetId = button.getAttribute('data-copy-target');

                button.addEventListener('click', async () => {
                    const target = document.getElementById(targetId);
                    const text = target?.value || target?.textContent || '';

                    const success = await REOT.utils.copyToClipboard(text);

                    if (success) {
                        REOT.utils.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                    } else {
                        REOT.utils.showNotification(REOT.i18n?.t('common.copyFailed') || '复制失败', 'error');
                    }
                });
            });
        }
    };

})();
