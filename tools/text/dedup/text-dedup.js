/**
 * 文本去重工具
 * @description 去除重复行
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const inputEl = document.getElementById('input');
    const outputEl = document.getElementById('output');
    const statsEl = document.getElementById('stats');
    const caseSensitiveCheck = document.getElementById('case-sensitive');
    const trimWhitespaceCheck = document.getElementById('trim-whitespace');
    const keepEmptyCheck = document.getElementById('keep-empty');
    const dedupBtn = document.getElementById('dedup-btn');
    const swapBtn = document.getElementById('swap-btn');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    /**
     * 去除重复行
     * @param {string} text
     * @param {Object} options
     * @returns {Object}
     */
    function deduplicate(text, options = {}) {
        const {
            caseSensitive = true,
            trimWhitespace = true,
            keepEmpty = false
        } = options;

        let lines = text.split('\n');
        const originalCount = lines.length;

        // 处理空行
        if (!keepEmpty) {
            lines = lines.filter(line => line.trim().length > 0);
        }

        // 去重
        const seen = new Set();
        const unique = [];

        for (const line of lines) {
            let normalized = trimWhitespace ? line.trim() : line;
            let key = caseSensitive ? normalized : normalized.toLowerCase();

            if (!seen.has(key)) {
                seen.add(key);
                unique.push(trimWhitespace ? normalized : line);
            }
        }

        return {
            result: unique.join('\n'),
            originalCount,
            uniqueCount: unique.length,
            removedCount: originalCount - unique.length
        };
    }

    /**
     * 执行去重
     */
    function performDedup() {
        const result = deduplicate(inputEl.value, {
            caseSensitive: caseSensitiveCheck.checked,
            trimWhitespace: trimWhitespaceCheck.checked,
            keepEmpty: keepEmptyCheck.checked
        });

        outputEl.value = result.result;
        const t = REOT.i18n?.t.bind(REOT.i18n);
        const original = t?.('tools.text-dedup.original') || '原始';
        const lines = t?.('tools.text-dedup.lines') || '行';
        const afterDedup = t?.('tools.text-dedup.afterDedup') || '去重后';
        const removed = t?.('tools.text-dedup.removed') || '移除';
        statsEl.textContent = `${original}: ${result.originalCount} ${lines} → ${afterDedup}: ${result.uniqueCount} ${lines} (${removed} ${result.removedCount} ${lines})`;
    }

    // 事件监听
    if (dedupBtn) {
        dedupBtn.addEventListener('click', performDedup);
    }

    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const temp = inputEl.value;
            inputEl.value = outputEl.value;
            outputEl.value = temp;
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputEl.value = '';
            outputEl.value = '';
            statsEl.textContent = '';
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            if (outputEl.value) {
                const success = await REOT.utils?.copyToClipboard(outputEl.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        });
    }

    // 导出到全局
    window.TextDedupTool = { deduplicate };

    // 设置默认示例数据
    if (inputEl && !inputEl.value) {
        inputEl.value = `apple
banana
apple
cherry
banana
date
apple
elderberry`;
    }
})();
