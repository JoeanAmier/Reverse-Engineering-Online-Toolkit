/**
 * URL 解析工具
 * @description URL 组成部分解析
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // DOM 元素
    const inputEl = document.getElementById('input');
    const parseBtn = document.getElementById('parse-btn');
    const clearBtn = document.getElementById('clear-btn');
    const resultSection = document.getElementById('result-section');
    const queryParamsSection = document.getElementById('query-params-section');
    const queryParamsBody = document.getElementById('query-params-body');

    /**
     * 解析 URL
     */
    function parseURL(urlString) {
        try {
            const url = new URL(urlString);
            return {
                protocol: url.protocol,
                host: url.host,
                hostname: url.hostname,
                port: url.port,
                pathname: url.pathname,
                search: url.search,
                hash: url.hash,
                origin: url.origin,
                searchParams: url.searchParams
            };
        } catch (error) {
            throw new Error('无效的 URL 格式');
        }
    }

    /**
     * 显示解析结果
     */
    function showResult(result) {
        document.getElementById('protocol').value = result.protocol;
        document.getElementById('host').value = result.host;
        document.getElementById('hostname').value = result.hostname;
        document.getElementById('port').value = result.port || '(默认)';
        document.getElementById('pathname').value = result.pathname;
        document.getElementById('search').value = result.search;
        document.getElementById('hash').value = result.hash;
        document.getElementById('origin').value = result.origin;

        resultSection.style.display = 'block';

        // 显示查询参数
        const params = [...result.searchParams.entries()];
        if (params.length > 0) {
            queryParamsBody.innerHTML = params.map(([key, value]) => `
                <tr>
                    <td><code>${escapeHtml(key)}</code></td>
                    <td><code>${escapeHtml(value)}</code></td>
                    <td><button class="btn btn--sm btn--outline copy-param" data-value="${escapeHtml(value)}">复制</button></td>
                </tr>
            `).join('');
            queryParamsSection.style.display = 'block';

            // 绑定复制事件
            queryParamsBody.querySelectorAll('.copy-param').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const value = btn.dataset.value;
                    const success = await REOT.utils?.copyToClipboard(value);
                    if (success) {
                        REOT.utils?.showNotification('已复制', 'success');
                    }
                });
            });
        } else {
            queryParamsSection.style.display = 'none';
        }
    }

    /**
     * 转义 HTML
     */
    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;');
    }

    // 事件监听
    if (parseBtn) {
        parseBtn.addEventListener('click', () => {
            try {
                const result = parseURL(inputEl.value);
                showResult(result);
            } catch (error) {
                resultSection.style.display = 'none';
                REOT.utils?.showNotification(error.message, 'error');
            }
        });
    }

    // 实时解析
    if (inputEl) {
        inputEl.addEventListener('input', () => {
            if (inputEl.value.trim()) {
                try {
                    const result = parseURL(inputEl.value);
                    showResult(result);
                } catch (e) {
                    // 输入过程中忽略错误
                }
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            inputEl.value = '';
            resultSection.style.display = 'none';
        });
    }

    // 复制按钮
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl && targetEl.value) {
                const success = await REOT.utils?.copyToClipboard(targetEl.value);
                if (success) {
                    REOT.utils?.showNotification('已复制', 'success');
                }
            }
        });
    });

    // 设置默认示例
    if (inputEl && !inputEl.value) {
        inputEl.value = 'https://example.com:8080/path/to/page?name=test&value=123#section';
        try {
            const result = parseURL(inputEl.value);
            showResult(result);
        } catch (e) {}
    }

    // 导出到全局
    window.URLParserTool = { parseURL };
})();
