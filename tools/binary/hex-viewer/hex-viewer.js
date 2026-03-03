/**
 * Hex 查看器工具
 * @description 查看文件或文本的十六进制表示
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let currentData = null;
    let currentDisplayLimit = 10000;  // 当前显示限制
    let currentOffset = 0;            // 当前已显示到的偏移量

    // 常见文件类型的 Magic Number
    const magicNumbers = {
        'PDF': { bytes: [0x25, 0x50, 0x44, 0x46], name: 'PDF Document' },
        'PNG': { bytes: [0x89, 0x50, 0x4E, 0x47], name: 'PNG Image' },
        'JPG': { bytes: [0xFF, 0xD8, 0xFF], name: 'JPEG Image' },
        'GIF': { bytes: [0x47, 0x49, 0x46, 0x38], name: 'GIF Image' },
        'ZIP': { bytes: [0x50, 0x4B, 0x03, 0x04], name: 'ZIP Archive' },
        'RAR': { bytes: [0x52, 0x61, 0x72, 0x21], name: 'RAR Archive' },
        '7Z': { bytes: [0x37, 0x7A, 0xBC, 0xAF], name: '7-Zip Archive' },
        'GZIP': { bytes: [0x1F, 0x8B], name: 'GZIP Archive' },
        'EXE': { bytes: [0x4D, 0x5A], name: 'Windows Executable' },
        'ELF': { bytes: [0x7F, 0x45, 0x4C, 0x46], name: 'ELF Executable' },
        'MP3': { bytes: [0x49, 0x44, 0x33], name: 'MP3 Audio' },
        'MP4': { bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], name: 'MP4 Video' },
        'WEBP': { bytes: [0x52, 0x49, 0x46, 0x46], name: 'WebP Image' },
        'WASM': { bytes: [0x00, 0x61, 0x73, 0x6D], name: 'WebAssembly' },
        'SQLITE': { bytes: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65], name: 'SQLite Database' }
    };

    /**
     * 获取选项
     */
    function getOptions() {
        const displayLimitValue = document.getElementById('display-limit')?.value || '10000';
        return {
            bytesPerLine: parseInt(document.getElementById('bytes-per-line')?.value || '16', 10),
            showAscii: document.getElementById('show-ascii')?.checked ?? true,
            uppercase: document.getElementById('uppercase')?.checked ?? true,
            displayLimit: parseInt(displayLimitValue, 10)  // -1 表示显示全部
        };
    }

    /**
     * 格式化文件大小
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 检测文件类型
     */
    function detectFileType(data) {
        if (!data || data.length < 8) return null;

        for (const [type, info] of Object.entries(magicNumbers)) {
            let match = true;
            for (let i = 0; i < info.bytes.length && i < data.length; i++) {
                if (data[i] !== info.bytes[i]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return info.name;
            }
        }
        return 'Unknown';
    }

    /**
     * 字节转十六进制字符串
     */
    function byteToHex(byte, uppercase) {
        const hex = byte.toString(16).padStart(2, '0');
        return uppercase ? hex.toUpperCase() : hex;
    }

    /**
     * 字节转可打印 ASCII
     */
    function byteToAscii(byte) {
        // 可打印字符范围: 32-126
        if (byte >= 32 && byte <= 126) {
            return String.fromCharCode(byte);
        }
        return '.';
    }

    /**
     * 生成 Hex 视图
     * @param {Uint8Array} data - 数据
     * @param {number} startOffset - 起始偏移量
     * @param {number} maxBytes - 最大显示字节数 (-1 为全部)
     * @returns {string} HTML 字符串
     */
    function generateHexView(data, startOffset = 0, maxBytes = -1) {
        if (!data || data.length === 0) return '';

        const options = getOptions();
        const { bytesPerLine, showAscii, uppercase, displayLimit } = options;

        // 计算实际显示的字节数
        const effectiveLimit = maxBytes > 0 ? maxBytes : (displayLimit > 0 ? displayLimit : data.length);
        const endOffset = Math.min(startOffset + effectiveLimit, data.length);

        let html = '<table class="hex-table">';
        html += '<thead><tr><th class="hex-offset">Offset</th>';
        html += '<th class="hex-bytes">Hex</th>';
        if (showAscii) {
            html += '<th class="hex-ascii">ASCII</th>';
        }
        html += '</tr></thead><tbody>';

        for (let offset = startOffset; offset < endOffset; offset += bytesPerLine) {
            const offsetHex = offset.toString(16).padStart(8, '0').toUpperCase();

            // 十六进制字节
            let hexBytes = '';
            let asciiChars = '';

            for (let i = 0; i < bytesPerLine; i++) {
                const byteIndex = offset + i;
                if (byteIndex < endOffset && byteIndex < data.length) {
                    const byte = data[byteIndex];
                    hexBytes += `<span class="hex-byte" data-offset="${byteIndex}">${byteToHex(byte, uppercase)}</span>`;
                    asciiChars += `<span class="ascii-char" data-offset="${byteIndex}">${byteToAscii(byte)}</span>`;
                } else {
                    hexBytes += '<span class="hex-byte empty">  </span>';
                    asciiChars += '<span class="ascii-char empty"> </span>';
                }

                // 每 8 个字节添加分隔
                if (i === 7 && bytesPerLine > 8) {
                    hexBytes += '<span class="hex-separator"> </span>';
                }
            }

            html += `<tr>`;
            html += `<td class="hex-offset">${offsetHex}</td>`;
            html += `<td class="hex-bytes">${hexBytes}</td>`;
            if (showAscii) {
                html += `<td class="hex-ascii">${asciiChars}</td>`;
            }
            html += '</tr>';
        }

        html += '</tbody></table>';

        // 更新当前偏移量
        currentOffset = endOffset;

        // 如果还有更多数据，显示截断提示和操作按钮
        if (endOffset < data.length) {
            const remainingBytes = data.length - endOffset;
            const nextChunkSize = Math.min(remainingBytes, effectiveLimit);

            html += `<div class="hex-truncated-panel">
                <div class="truncated-info">
                    <span class="truncated-icon">⚠️</span>
                    <span>已显示 <strong>${endOffset.toLocaleString()}</strong> / <strong>${data.length.toLocaleString()}</strong> 字节，剩余 <strong>${remainingBytes.toLocaleString()}</strong> 字节</span>
                </div>
                <div class="truncated-actions">
                    <button id="load-more-btn" class="btn btn--sm btn--primary" data-next="${nextChunkSize}">
                        加载更多 (${formatFileSize(nextChunkSize)})
                    </button>
                    <button id="load-all-btn" class="btn btn--sm btn--outline" data-remaining="${remainingBytes}">
                        显示全部 (${formatFileSize(remainingBytes)})
                    </button>
                </div>
                <div class="truncated-warning" ${remainingBytes > 500000 ? '' : 'style="display:none"'}>
                    <span>💡 提示：显示大量数据可能导致页面卡顿</span>
                </div>
            </div>`;
        }

        return html;
    }

    /**
     * 追加更多 Hex 数据
     * @param {number} additionalBytes - 要追加的字节数 (-1 为全部剩余)
     */
    function loadMoreHexData(additionalBytes = -1) {
        if (!currentData) return;

        const hexOutput = document.getElementById('hex-output');
        if (!hexOutput) return;

        const options = getOptions();
        const { bytesPerLine, showAscii, uppercase } = options;

        // 移除旧的截断面板
        const oldPanel = hexOutput.querySelector('.hex-truncated-panel');
        if (oldPanel) {
            oldPanel.remove();
        }

        // 计算要加载的字节数
        const remainingBytes = currentData.length - currentOffset;
        const bytesToLoad = additionalBytes > 0 ? Math.min(additionalBytes, remainingBytes) : remainingBytes;
        const endOffset = currentOffset + bytesToLoad;

        // 获取现有的表格 tbody
        const tbody = hexOutput.querySelector('tbody');
        if (!tbody) return;

        // 生成新行
        let newRows = '';
        for (let offset = currentOffset; offset < endOffset; offset += bytesPerLine) {
            const offsetHex = offset.toString(16).padStart(8, '0').toUpperCase();

            let hexBytes = '';
            let asciiChars = '';

            for (let i = 0; i < bytesPerLine; i++) {
                const byteIndex = offset + i;
                if (byteIndex < endOffset && byteIndex < currentData.length) {
                    const byte = currentData[byteIndex];
                    hexBytes += `<span class="hex-byte" data-offset="${byteIndex}">${byteToHex(byte, uppercase)}</span>`;
                    asciiChars += `<span class="ascii-char" data-offset="${byteIndex}">${byteToAscii(byte)}</span>`;
                } else {
                    hexBytes += '<span class="hex-byte empty">  </span>';
                    asciiChars += '<span class="ascii-char empty"> </span>';
                }

                if (i === 7 && bytesPerLine > 8) {
                    hexBytes += '<span class="hex-separator"> </span>';
                }
            }

            newRows += `<tr>`;
            newRows += `<td class="hex-offset">${offsetHex}</td>`;
            newRows += `<td class="hex-bytes">${hexBytes}</td>`;
            if (showAscii) {
                newRows += `<td class="hex-ascii">${asciiChars}</td>`;
            }
            newRows += '</tr>';
        }

        // 追加新行
        tbody.insertAdjacentHTML('beforeend', newRows);

        // 更新当前偏移量
        currentOffset = endOffset;

        // 如果还有更多数据，添加新的截断面板
        if (endOffset < currentData.length) {
            const remainingBytes = currentData.length - endOffset;
            const displayLimit = options.displayLimit > 0 ? options.displayLimit : 10000;
            const nextChunkSize = Math.min(remainingBytes, displayLimit);

            const panelHtml = `<div class="hex-truncated-panel">
                <div class="truncated-info">
                    <span class="truncated-icon">⚠️</span>
                    <span>已显示 <strong>${endOffset.toLocaleString()}</strong> / <strong>${currentData.length.toLocaleString()}</strong> 字节，剩余 <strong>${remainingBytes.toLocaleString()}</strong> 字节</span>
                </div>
                <div class="truncated-actions">
                    <button id="load-more-btn" class="btn btn--sm btn--primary" data-next="${nextChunkSize}">
                        加载更多 (${formatFileSize(nextChunkSize)})
                    </button>
                    <button id="load-all-btn" class="btn btn--sm btn--outline" data-remaining="${remainingBytes}">
                        显示全部 (${formatFileSize(remainingBytes)})
                    </button>
                </div>
                <div class="truncated-warning" ${remainingBytes > 500000 ? '' : 'style="display:none"'}>
                    <span>💡 提示：显示大量数据可能导致页面卡顿</span>
                </div>
            </div>`;

            hexOutput.insertAdjacentHTML('beforeend', panelHtml);
        } else {
            // 全部加载完成
            REOT.utils?.showNotification(REOT.i18n?.t('tools.hex-viewer.allDataLoaded') || '全部数据已加载', 'success');
        }

        // 重新绑定高亮事件
        addByteHighlighting();
    }

    /**
     * 显示 Hex 视图
     */
    function showHexView() {
        const textInput = document.getElementById('text-input');
        let data;

        if (currentData) {
            data = currentData;
        } else if (textInput?.value && !textInput.disabled) {
            // 将文本转换为字节数组
            const encoder = new TextEncoder();
            data = encoder.encode(textInput.value);
            currentData = data;  // 保存以便后续加载更多
        } else {
            REOT.utils?.showNotification(REOT.i18n?.t('tools.hex-viewer.enterTextOrUpload') || '请输入文本或上传文件', 'warning');
            return;
        }

        // 重置偏移量
        currentOffset = 0;

        // 更新统计信息
        const statsSection = document.getElementById('stats-section');
        const outputSection = document.getElementById('output-section');
        const searchSection = document.getElementById('search-section');

        if (statsSection) {
            statsSection.style.display = 'block';
            document.getElementById('file-size').textContent = formatFileSize(data.length);
            document.getElementById('total-bytes').textContent = data.length.toLocaleString();
            document.getElementById('magic-number').textContent = detectFileType(data) || '-';
        }

        if (outputSection) {
            outputSection.style.display = 'block';
            document.getElementById('hex-output').innerHTML = generateHexView(data);
        }

        if (searchSection) {
            searchSection.style.display = 'block';
        }

        // 添加字节高亮交互
        addByteHighlighting();

        REOT.utils?.showNotification(REOT.i18n?.t('tools.hex-viewer.hexGenerated') || 'Hex 视图已生成', 'success');
    }

    /**
     * 添加字节高亮交互
     */
    function addByteHighlighting() {
        const hexOutput = document.getElementById('hex-output');
        if (!hexOutput) return;

        // 防止重复绑定事件监听器
        if (hexOutput._highlightBound) return;
        hexOutput._highlightBound = true;

        hexOutput.addEventListener('mouseover', (e) => {
            const target = e.target;
            if (target.dataset.offset !== undefined) {
                const offset = target.dataset.offset;
                // 高亮对应的 hex 和 ascii
                hexOutput.querySelectorAll(`[data-offset="${offset}"]`).forEach(el => {
                    el.classList.add('highlighted');
                });
            }
        });

        hexOutput.addEventListener('mouseout', (e) => {
            const target = e.target;
            if (target.dataset.offset !== undefined) {
                const offset = target.dataset.offset;
                hexOutput.querySelectorAll(`[data-offset="${offset}"]`).forEach(el => {
                    el.classList.remove('highlighted');
                });
            }
        });
    }

    /**
     * 搜索功能
     */
    function searchHex(query) {
        if (!currentData && !document.getElementById('text-input')?.value) {
            return;
        }

        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        let data = currentData;
        if (!data) {
            const encoder = new TextEncoder();
            data = encoder.encode(document.getElementById('text-input').value);
        }

        // 尝试解析为 hex 或 ASCII
        let searchBytes = [];
        const hexMatch = query.match(/^([0-9A-Fa-f]{2}\s*)+$/);

        if (hexMatch) {
            // Hex 搜索
            const hexValues = query.replace(/\s/g, '').match(/.{2}/g);
            searchBytes = hexValues.map(h => parseInt(h, 16));
        } else {
            // ASCII 搜索
            const encoder = new TextEncoder();
            searchBytes = Array.from(encoder.encode(query));
        }

        if (searchBytes.length === 0) {
            searchResults.innerHTML = '<p>请输入搜索内容</p>';
            return;
        }

        // 搜索匹配
        const matches = [];
        for (let i = 0; i <= data.length - searchBytes.length; i++) {
            let found = true;
            for (let j = 0; j < searchBytes.length; j++) {
                if (data[i + j] !== searchBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                matches.push(i);
            }
        }

        if (matches.length === 0) {
            searchResults.innerHTML = '<p>未找到匹配</p>';
        } else {
            searchResults.innerHTML = `<p>找到 ${matches.length} 个匹配</p>
                <ul class="match-list">
                    ${matches.slice(0, 100).map(offset =>
                        `<li>Offset: 0x${offset.toString(16).padStart(8, '0').toUpperCase()}</li>`
                    ).join('')}
                    ${matches.length > 100 ? '<li>... 仅显示前 100 个结果</li>' : ''}
                </ul>`;
        }
    }

    /**
     * 复制到剪贴板
     */
    async function copyToClipboard(text) {
        const success = await REOT.utils?.copyToClipboard(text);
        if (success) {
            REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
        }
    }

    // 文件上传处理
    document.addEventListener('change', (e) => {
        if (e.target.id === 'file-input') {
            const file = e.target.files[0];
            if (!file) return;

            const fileInfo = document.getElementById('file-info');
            const textInput = document.getElementById('text-input');

            const reader = new FileReader();
            reader.onload = (event) => {
                currentData = new Uint8Array(event.target.result);

                if (fileInfo) {
                    fileInfo.style.display = 'block';
                    fileInfo.innerHTML = `
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${formatFileSize(file.size)}</span>
                    `;
                }

                if (textInput) {
                    textInput.value = `[文件已加载: ${file.name}]`;
                    textInput.disabled = true;
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // 检查当前是否在 Hex Viewer 工具页面
    function isHexViewerToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/binary/hex-viewer');
    }

    // 事件委托处理器
    document.addEventListener('click', (e) => {
        // 只在 Hex Viewer 工具页面处理事件
        if (!isHexViewerToolActive()) return;

        const target = e.target;

        // 查看按钮
        if (target.id === 'view-btn' || target.closest('#view-btn')) {
            showHexView();
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const textInput = document.getElementById('text-input');
            const fileInfo = document.getElementById('file-info');
            const fileInput = document.getElementById('file-input');
            const statsSection = document.getElementById('stats-section');
            const outputSection = document.getElementById('output-section');
            const searchSection = document.getElementById('search-section');

            if (textInput) {
                textInput.value = '';
                textInput.disabled = false;
            }
            if (fileInfo) fileInfo.style.display = 'none';
            if (fileInput) fileInput.value = '';
            if (statsSection) statsSection.style.display = 'none';
            if (outputSection) outputSection.style.display = 'none';
            if (searchSection) searchSection.style.display = 'none';
            currentData = null;
            currentOffset = 0;
        }

        // 加载更多按钮
        if (target.id === 'load-more-btn' || target.closest('#load-more-btn')) {
            const btn = target.id === 'load-more-btn' ? target : target.closest('#load-more-btn');
            const nextBytes = parseInt(btn.dataset.next, 10);
            loadMoreHexData(nextBytes);
        }

        // 显示全部按钮
        if (target.id === 'load-all-btn' || target.closest('#load-all-btn')) {
            const btn = target.id === 'load-all-btn' ? target : target.closest('#load-all-btn');
            const remaining = parseInt(btn.dataset.remaining, 10);

            // 如果剩余数据太大，给出警告
            if (remaining > 1000000) {
                if (!confirm(REOT.i18n?.t('tools.hex-viewer.loadAllWarning')?.replace('{0}', formatFileSize(remaining)) || `即将加载 ${formatFileSize(remaining)} 数据，这可能导致页面卡顿或无响应。\n\n确定要继续吗？`)) {
                    return;
                }
            }

            loadMoreHexData(-1);  // -1 表示加载全部
        }

        // 复制按钮
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            const hexOutput = document.getElementById('hex-output');
            if (hexOutput) {
                // 复制纯文本格式
                const rows = hexOutput.querySelectorAll('tbody tr');
                let text = '';
                rows.forEach(row => {
                    const offset = row.querySelector('.hex-offset')?.textContent || '';
                    const bytes = Array.from(row.querySelectorAll('.hex-byte:not(.empty)'))
                        .map(el => el.textContent)
                        .join(' ');
                    const ascii = Array.from(row.querySelectorAll('.ascii-char:not(.empty)'))
                        .map(el => el.textContent)
                        .join('');
                    text += `${offset}  ${bytes}  |${ascii}|\n`;
                });
                copyToClipboard(text);
            }
        }

        // 搜索按钮
        if (target.id === 'search-btn' || target.closest('#search-btn')) {
            const searchInput = document.getElementById('search-input');
            if (searchInput && searchInput.value) {
                searchHex(searchInput.value);
            }
        }
    });

    // 搜索输入回车
    document.addEventListener('keypress', (e) => {
        if (e.target.id === 'search-input' && e.key === 'Enter') {
            searchHex(e.target.value);
        }
    });

    // 导出工具函数
    window.HexViewerTool = {
        generateHexView,
        detectFileType,
        byteToHex,
        byteToAscii
    };

    // 设置默认示例数据
    const defaultInput = document.getElementById('text-input');
    if (defaultInput && !defaultInput.value) {
        defaultInput.value = 'Hello, REOT! This is a sample text for the Hex Viewer tool.';
    }

})();
