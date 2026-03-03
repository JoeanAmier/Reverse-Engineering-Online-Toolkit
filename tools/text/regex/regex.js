/**
 * 正则表达式测试工具
 * @description 正则表达式在线测试与调试
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const regexInput = document.getElementById('regex-input');
    const flagsInput = document.getElementById('flags-input');
    const inputEl = document.getElementById('input');
    const matchesResult = document.getElementById('matches-result');
    const highlightedText = document.getElementById('highlighted-text');
    const replaceInput = document.getElementById('replace-input');
    const replaceResult = document.getElementById('replace-result');
    const replaceBtn = document.getElementById('replace-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Flag checkboxes
    const flagG = document.getElementById('flag-g');
    const flagI = document.getElementById('flag-i');
    const flagM = document.getElementById('flag-m');
    const flagS = document.getElementById('flag-s');

    /**
     * 更新 flags 输入框
     */
    function updateFlags() {
        let flags = '';
        if (flagG.checked) flags += 'g';
        if (flagI.checked) flags += 'i';
        if (flagM.checked) flags += 'm';
        if (flagS.checked) flags += 's';
        flagsInput.value = flags;
        testRegex();
    }

    /**
     * 从输入框更新 checkboxes
     */
    function syncFlagsFromInput() {
        const flags = flagsInput.value;
        flagG.checked = flags.includes('g');
        flagI.checked = flags.includes('i');
        flagM.checked = flags.includes('m');
        flagS.checked = flags.includes('s');
    }

    /**
     * 转义 HTML
     * @param {string} text
     * @returns {string}
     */
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * 测试正则表达式
     */
    function testRegex() {
        const pattern = regexInput.value;
        const flags = flagsInput.value;
        const text = inputEl.value;

        if (!pattern) {
            matchesResult.innerHTML = '<span class="no-matches">' + (REOT.i18n?.t('tools.regex.enterRegex') || '请输入正则表达式') + '</span>';
            highlightedText.innerHTML = escapeHtml(text);
            return;
        }

        try {
            const regex = new RegExp(pattern, flags);
            const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');

            // 获取所有匹配
            const matches = [...text.matchAll(globalRegex)];

            // 显示匹配结果
            if (matches.length === 0) {
                matchesResult.textContent = '';
                const noMatchSpan = document.createElement('span');
                noMatchSpan.className = 'no-matches';
                noMatchSpan.textContent = REOT.i18n?.t('tools.regex.noMatches') || '没有匹配';
                matchesResult.appendChild(noMatchSpan);
            } else {
                matchesResult.innerHTML = matches.map((match, i) => `
                    <div class="match-item">
                        <span class="match-index">#${i + 1}</span>
                        <span class="match-text">"${escapeHtml(match[0])}"</span>
                        <span class="match-position">位置: ${match.index}</span>
                        ${match.length > 1 ? `<div class="match-groups">
                            ${match.slice(1).map((g, j) =>
                                `<span class="match-group">$${j + 1}: "${escapeHtml(g || '')}"</span>`
                            ).join('')}
                        </div>` : ''}
                    </div>
                `).join('');
            }

            // 高亮显示 - 将文本按匹配/非匹配部分拆分，全部转义后拼接
            let highlighted = '';
            let lastIndex = 0;

            for (const match of [...text.matchAll(globalRegex)]) {
                // 转义匹配之前的非匹配文本
                highlighted += escapeHtml(text.substring(lastIndex, match.index));
                // 包裹匹配文本（匹配部分也经过 escapeHtml 处理）
                highlighted += '<mark class="regex-highlight">' + escapeHtml(match[0]) + '</mark>';
                lastIndex = match.index + match[0].length;
            }
            // 转义最后一段非匹配文本
            highlighted += escapeHtml(text.substring(lastIndex));

            // 所有用户输入均已通过 escapeHtml 转义，安全设置 innerHTML
            highlightedText.innerHTML = highlighted;

        } catch (error) {
            matchesResult.innerHTML = `<span class="regex-error">${REOT.i18n?.t('tools.regex.error') || '错误'}: ${escapeHtml(error.message)}</span>`;
            highlightedText.innerHTML = escapeHtml(text);
        }
    }

    /**
     * 执行替换
     */
    function performReplace() {
        const pattern = regexInput.value;
        const flags = flagsInput.value;
        const text = inputEl.value;
        const replacement = replaceInput.value;

        if (!pattern) {
            replaceResult.value = text;
            return;
        }

        try {
            const regex = new RegExp(pattern, flags);
            replaceResult.value = text.replace(regex, replacement);
        } catch (error) {
            replaceResult.value = `${REOT.i18n?.t('tools.regex.error') || '错误'}: ${error.message}`;
        }
    }

    // 事件监听
    [regexInput, inputEl].forEach(el => {
        el.addEventListener('input', testRegex);
    });

    flagsInput.addEventListener('input', () => {
        syncFlagsFromInput();
        testRegex();
    });

    [flagG, flagI, flagM, flagS].forEach(el => {
        el.addEventListener('change', updateFlags);
    });

    if (replaceBtn) {
        replaceBtn.addEventListener('click', performReplace);
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            if (replaceResult.value) {
                const success = await REOT.utils?.copyToClipboard(replaceResult.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        });
    }

    // 导出到全局
    window.RegexTool = { testRegex, performReplace };

    // 设置默认示例数据
    if (regexInput && !regexInput.value) {
        regexInput.value = '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b';
    }
    if (inputEl && !inputEl.value) {
        inputEl.value = `Contact us at:
- support@example.com
- admin@reot.io
- john.doe@company.org
- invalid-email@
- test@test.co.uk

Please send your feedback to feedback@example.com`;
        testRegex();
    }
})();
