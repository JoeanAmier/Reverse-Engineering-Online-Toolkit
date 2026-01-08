/**
 * 模式搜索工具
 * @description 在二进制数据中搜索字节模式
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // 当前加载的数据
    let currentData = null;

    /**
     * 检查当前是否在模式搜索工具页面
     */
    function isPatternSearchActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/reverse/pattern-search');
    }

    /**
     * 解析十六进制字符串为字节数组
     */
    function parseHexString(str) {
        str = str.replace(/\s+/g, '').toUpperCase();
        if (str.length % 2 !== 0) {
            throw new Error('无效的十六进制字符串：长度必须为偶数');
        }

        const bytes = [];
        for (let i = 0; i < str.length; i += 2) {
            const hex = str.substr(i, 2);
            if (!/^[0-9A-F]{2}$/.test(hex)) {
                throw new Error(`无效的十六进制字符：${hex}`);
            }
            bytes.push(parseInt(hex, 16));
        }
        return new Uint8Array(bytes);
    }

    /**
     * 格式化字节数组为十六进制字符串
     */
    function formatHex(bytes, separator = ' ') {
        return Array.from(bytes)
            .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
            .join(separator);
    }

    /**
     * 将字节数组转换为可打印的 ASCII 字符串
     */
    function bytesToAscii(bytes) {
        return Array.from(bytes)
            .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
            .join('');
    }

    /**
     * 解析搜索模式（支持通配符 ??）
     * 返回 { pattern: Uint8Array, mask: Uint8Array }
     * mask 中 0xFF 表示需要匹配，0x00 表示通配符
     */
    function parseHexPattern(str) {
        str = str.replace(/\s+/g, '').toUpperCase();
        if (str.length % 2 !== 0) {
            throw new Error('无效的模式：长度必须为偶数');
        }

        const pattern = [];
        const mask = [];

        for (let i = 0; i < str.length; i += 2) {
            const hex = str.substr(i, 2);
            if (hex === '??' || hex === '**') {
                pattern.push(0);
                mask.push(0x00);
            } else if (/^[0-9A-F]{2}$/.test(hex)) {
                pattern.push(parseInt(hex, 16));
                mask.push(0xFF);
            } else {
                throw new Error(`无效的模式字符：${hex}`);
            }
        }

        return {
            pattern: new Uint8Array(pattern),
            mask: new Uint8Array(mask)
        };
    }

    /**
     * 使用模式和掩码搜索数据
     */
    function searchWithMask(data, pattern, mask) {
        const results = [];
        const patternLen = pattern.length;

        for (let i = 0; i <= data.length - patternLen; i++) {
            let match = true;
            for (let j = 0; j < patternLen; j++) {
                if (mask[j] !== 0 && data[i + j] !== pattern[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                results.push(i);
            }
        }

        return results;
    }

    /**
     * ASCII 文本搜索
     */
    function searchAscii(data, text, caseSensitive) {
        const results = [];
        const searchBytes = new TextEncoder().encode(text);
        const searchLen = searchBytes.length;

        if (!caseSensitive) {
            const lowerText = text.toLowerCase();
            const upperText = text.toUpperCase();
            const lowerBytes = new TextEncoder().encode(lowerText);
            const upperBytes = new TextEncoder().encode(upperText);

            for (let i = 0; i <= data.length - searchLen; i++) {
                let match = true;
                for (let j = 0; j < searchLen; j++) {
                    const b = data[i + j];
                    if (b !== lowerBytes[j] && b !== upperBytes[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    results.push(i);
                }
            }
        } else {
            for (let i = 0; i <= data.length - searchLen; i++) {
                let match = true;
                for (let j = 0; j < searchLen; j++) {
                    if (data[i + j] !== searchBytes[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    results.push(i);
                }
            }
        }

        return results;
    }

    /**
     * 正则表达式搜索（在 ASCII 表示中搜索）
     */
    function searchRegex(data, regexStr, caseSensitive) {
        const results = [];
        const ascii = bytesToAscii(data);
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(regexStr, flags);

        let match;
        while ((match = regex.exec(ascii)) !== null) {
            results.push({
                offset: match.index,
                length: match[0].length
            });
            // 防止无限循环
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }

        return results;
    }

    /**
     * 执行搜索
     */
    function performSearch(findAll = false) {
        const patternInput = document.getElementById('pattern-input')?.value?.trim();
        const patternType = document.getElementById('pattern-type')?.value;
        const caseSensitive = document.getElementById('case-sensitive')?.checked;
        const showContext = document.getElementById('show-context')?.checked;

        if (!currentData || currentData.length === 0) {
            throw new Error('请先加载数据');
        }

        if (!patternInput) {
            throw new Error('请输入搜索模式');
        }

        let results = [];
        let patternLength = 0;

        switch (patternType) {
            case 'hex':
                const { pattern, mask } = parseHexPattern(patternInput);
                patternLength = pattern.length;
                results = searchWithMask(currentData, pattern, mask).map(offset => ({
                    offset,
                    length: patternLength
                }));
                break;

            case 'ascii':
                const textBytes = new TextEncoder().encode(patternInput);
                patternLength = textBytes.length;
                results = searchAscii(currentData, patternInput, caseSensitive).map(offset => ({
                    offset,
                    length: patternLength
                }));
                break;

            case 'regex':
                results = searchRegex(currentData, patternInput, caseSensitive);
                break;
        }

        if (!findAll && results.length > 100) {
            results = results.slice(0, 100);
        }

        displayResults(results, showContext);
        return results;
    }

    /**
     * 显示搜索结果
     */
    function displayResults(results, showContext) {
        const resultsSection = document.getElementById('results-section');
        const resultsList = document.getElementById('results-list');
        const resultsCount = document.getElementById('results-count');

        if (!resultsSection || !resultsList || !resultsCount) return;

        resultsSection.style.display = 'block';
        resultsCount.textContent = `找到 ${results.length} 个匹配`;

        if (results.length === 0) {
            resultsList.innerHTML = `
                <div class="no-results">
                    <p>未找到匹配的模式</p>
                </div>
            `;
            return;
        }

        const contextSize = 8; // 前后显示的字节数
        let html = '';

        results.forEach((result, index) => {
            const { offset, length } = result;

            // 计算上下文范围
            const contextStart = Math.max(0, offset - contextSize);
            const contextEnd = Math.min(currentData.length, offset + length + contextSize);

            // 获取上下文数据
            const beforeBytes = currentData.slice(contextStart, offset);
            const matchBytes = currentData.slice(offset, offset + length);
            const afterBytes = currentData.slice(offset + length, contextEnd);

            let contextHtml = '';
            if (showContext) {
                contextHtml = `
                    <div class="result-context">
                        ${formatHex(beforeBytes)}
                        <span class="result-match">${formatHex(matchBytes)}</span>
                        ${formatHex(afterBytes)}
                    </div>
                    <div class="result-ascii">
                        ASCII: ${bytesToAscii(beforeBytes)}<span class="result-match">${bytesToAscii(matchBytes)}</span>${bytesToAscii(afterBytes)}
                    </div>
                `;
            } else {
                contextHtml = `
                    <div class="result-context">
                        <span class="result-match">${formatHex(matchBytes)}</span>
                    </div>
                `;
            }

            html += `
                <div class="result-item" data-offset="${offset}">
                    <span class="result-offset">偏移: 0x${offset.toString(16).toUpperCase().padStart(8, '0')} (${offset})</span>
                    ${contextHtml}
                </div>
            `;
        });

        resultsList.innerHTML = html;
    }

    /**
     * 加载文件数据
     */
    function loadFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentData = new Uint8Array(e.target.result);
                resolve(currentData);
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 从十六进制输入加载数据
     */
    function loadFromHexInput() {
        const hexInput = document.getElementById('hex-input')?.value?.trim();
        if (!hexInput) {
            currentData = null;
            return;
        }

        try {
            currentData = parseHexString(hexInput.replace(/\s+/g, ''));
        } catch (error) {
            throw new Error('十六进制解析失败: ' + error.message);
        }
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isPatternSearchActive()) return;

        const target = e.target;

        // 搜索按钮
        if (target.id === 'search-btn' || target.closest('#search-btn')) {
            try {
                // 如果没有文件数据，尝试从十六进制输入加载
                if (!currentData) {
                    loadFromHexInput();
                }
                performSearch(false);
                REOT.utils?.showNotification('搜索完成', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 搜索全部按钮
        if (target.id === 'search-all-btn' || target.closest('#search-all-btn')) {
            try {
                if (!currentData) {
                    loadFromHexInput();
                }
                performSearch(true);
                REOT.utils?.showNotification('搜索完成', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 清除数据按钮
        if (target.id === 'clear-data-btn' || target.closest('#clear-data-btn')) {
            currentData = null;
            const hexInput = document.getElementById('hex-input');
            const fileInfo = document.getElementById('file-info');
            if (hexInput) hexInput.value = '';
            if (fileInfo) fileInfo.textContent = '';
        }

        // 清除结果按钮
        if (target.id === 'clear-results-btn' || target.closest('#clear-results-btn')) {
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) resultsSection.style.display = 'none';
        }
    });

    // 文件输入处理
    document.addEventListener('change', async (e) => {
        if (!isPatternSearchActive()) return;

        if (e.target.id === 'file-input') {
            const file = e.target.files[0];
            if (file) {
                try {
                    await loadFile(file);
                    const fileInfo = document.getElementById('file-info');
                    if (fileInfo) {
                        fileInfo.textContent = `${file.name} (${currentData.length} 字节)`;
                    }
                    REOT.utils?.showNotification(`已加载: ${file.name}`, 'success');
                } catch (error) {
                    REOT.utils?.showNotification(error.message, 'error');
                }
            }
        }
    });

    // 拖拽处理
    document.addEventListener('dragover', (e) => {
        if (!isPatternSearchActive()) return;
        const dropZone = document.getElementById('drop-zone');
        if (dropZone && dropZone.contains(e.target)) {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }
    });

    document.addEventListener('dragleave', (e) => {
        if (!isPatternSearchActive()) return;
        const dropZone = document.getElementById('drop-zone');
        if (dropZone && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('dragover');
        }
    });

    document.addEventListener('drop', async (e) => {
        if (!isPatternSearchActive()) return;
        const dropZone = document.getElementById('drop-zone');
        if (dropZone && dropZone.contains(e.target)) {
            e.preventDefault();
            dropZone.classList.remove('dragover');

            const file = e.dataTransfer.files[0];
            if (file) {
                try {
                    await loadFile(file);
                    const fileInfo = document.getElementById('file-info');
                    if (fileInfo) {
                        fileInfo.textContent = `${file.name} (${currentData.length} 字节)`;
                    }
                    REOT.utils?.showNotification(`已加载: ${file.name}`, 'success');
                } catch (error) {
                    REOT.utils?.showNotification(error.message, 'error');
                }
            }
        }
    });

    // 点击拖拽区域触发文件选择
    document.addEventListener('click', (e) => {
        if (!isPatternSearchActive()) return;
        const dropZone = document.getElementById('drop-zone');
        if (dropZone && e.target === dropZone || dropZone?.contains(e.target)) {
            if (!e.target.closest('.file-upload-btn')) {
                document.getElementById('file-input')?.click();
            }
        }
    });

    // 导出工具函数
    window.PatternSearch = {
        parseHexString,
        parseHexPattern,
        searchWithMask,
        searchAscii,
        searchRegex,
        formatHex,
        bytesToAscii
    };

})();
