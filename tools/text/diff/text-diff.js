/**
 * 文本差异对比工具
 * @description 两段文本的差异对比
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const text1El = document.getElementById('text1');
    const text2El = document.getElementById('text2');
    const compareBtn = document.getElementById('compare-btn');
    const swapBtn = document.getElementById('swap-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultSection = document.getElementById('result-section');
    const diffStats = document.getElementById('diff-stats');
    const diffOutput = document.getElementById('diff-output');

    /**
     * 计算最长公共子序列 (LCS)
     */
    function lcs(a, b) {
        const m = a.length;
        const n = b.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp;
    }

    /**
     * 回溯获取差异
     */
    function backtrack(dp, a, b, i, j) {
        const result = [];

        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                result.unshift({ type: 'equal', value: a[i - 1] });
                i--;
                j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) {
                result.unshift({ type: 'delete', value: a[i - 1] });
                i--;
            } else {
                result.unshift({ type: 'insert', value: b[j - 1] });
                j--;
            }
        }

        while (i > 0) {
            result.unshift({ type: 'delete', value: a[i - 1] });
            i--;
        }

        while (j > 0) {
            result.unshift({ type: 'insert', value: b[j - 1] });
            j--;
        }

        return result;
    }

    /**
     * 按行比较
     */
    function diffLines(text1, text2) {
        const lines1 = text1.split('\n');
        const lines2 = text2.split('\n');

        const dp = lcs(lines1, lines2);
        return backtrack(dp, lines1, lines2, lines1.length, lines2.length);
    }

    /**
     * 转义 HTML
     */
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * 渲染差异
     */
    function renderDiff(diffs) {
        let insertCount = 0;
        let deleteCount = 0;
        let equalCount = 0;

        const html = diffs.map((diff, index) => {
            const lineNum = index + 1;
            const content = escapeHtml(diff.value);

            switch (diff.type) {
                case 'insert':
                    insertCount++;
                    return `<div class="diff-line diff-insert"><span class="line-num">+</span><span class="line-content">${content || '&nbsp;'}</span></div>`;
                case 'delete':
                    deleteCount++;
                    return `<div class="diff-line diff-delete"><span class="line-num">-</span><span class="line-content">${content || '&nbsp;'}</span></div>`;
                default:
                    equalCount++;
                    return `<div class="diff-line diff-equal"><span class="line-num">&nbsp;</span><span class="line-content">${content || '&nbsp;'}</span></div>`;
            }
        }).join('');

        return {
            html,
            stats: { insertCount, deleteCount, equalCount }
        };
    }

    /**
     * 执行对比
     */
    function compare() {
        const text1 = text1El.value;
        const text2 = text2El.value;

        if (!text1 && !text2) {
            resultSection.style.display = 'none';
            return;
        }

        const diffs = diffLines(text1, text2);
        const { html, stats } = renderDiff(diffs);

        diffStats.innerHTML = `
            <span class="stat-item stat-insert">+${stats.insertCount} 新增</span>
            <span class="stat-item stat-delete">-${stats.deleteCount} 删除</span>
            <span class="stat-item stat-equal">${stats.equalCount} 相同</span>
        `;

        diffOutput.innerHTML = html;
        resultSection.style.display = 'block';
    }

    // 事件监听
    if (compareBtn) {
        compareBtn.addEventListener('click', compare);
    }

    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            const temp = text1El.value;
            text1El.value = text2El.value;
            text2El.value = temp;
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            text1El.value = '';
            text2El.value = '';
            resultSection.style.display = 'none';
        });
    }

    // 设置默认示例
    if (!text1El.value && !text2El.value) {
        text1El.value = `Hello World
This is a test
Line 3
Line 4
Line 5`;
        text2El.value = `Hello World
This is a modified test
Line 3
New Line 4
Line 5
Line 6`;
    }

    // 导出到全局
    window.TextDiffTool = { diffLines };
})();
