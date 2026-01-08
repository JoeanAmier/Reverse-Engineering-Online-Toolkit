/**
 * CSV 解析器工具
 * @description CSV 解析、格式化，支持 JSON 互转
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    let parsedData = null;
    let headers = null;

    // CodeMirror 编辑器实例
    let inputEditor = null;
    let jsonOutputEditor = null;

    /**
     * 获取输入值
     */
    function getInputValue() {
        if (inputEditor) {
            return inputEditor.getValue();
        }
        return document.getElementById('input')?.value || '';
    }

    /**
     * 设置输入值
     */
    function setInputValue(value) {
        if (inputEditor) {
            inputEditor.setValue(value);
        }
        const inputEl = document.getElementById('input');
        if (inputEl) {
            inputEl.value = value;
        }
    }

    /**
     * 获取 JSON 输出值
     */
    function getJsonOutputValue() {
        if (jsonOutputEditor) {
            return jsonOutputEditor.getValue();
        }
        return document.getElementById('json-output')?.value || '';
    }

    /**
     * 设置 JSON 输出值
     */
    function setJsonOutputValue(value) {
        if (jsonOutputEditor) {
            jsonOutputEditor.setValue(value);
        }
        const outputEl = document.getElementById('json-output');
        if (outputEl) {
            outputEl.value = value;
        }
    }

    /**
     * 检查当前是否在 CSV 工具页面
     */
    function isCsvToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/formatting/csv');
    }

    /**
     * 获取分隔符
     */
    function getDelimiter() {
        const select = document.getElementById('delimiter-select');
        const customInput = document.getElementById('custom-delimiter');

        if (select?.value === 'custom') {
            return customInput?.value || ',';
        }

        return select?.value === '\\t' ? '\t' : (select?.value || ',');
    }

    /**
     * 是否有表头
     */
    function hasHeader() {
        const select = document.getElementById('has-header');
        return select?.value === 'true';
    }

    /**
     * 解析 CSV 字符串
     * @param {string} csv - CSV 字符串
     * @param {string} delimiter - 分隔符
     * @returns {Array<Array<string>>} - 二维数组
     */
    function parseCSV(csv, delimiter = ',') {
        const rows = [];
        let currentRow = [];
        let currentCell = '';
        let inQuotes = false;

        for (let i = 0; i < csv.length; i++) {
            const char = csv[i];
            const nextChar = csv[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        // 转义的引号
                        currentCell += '"';
                        i++;
                    } else {
                        // 结束引号
                        inQuotes = false;
                    }
                } else {
                    currentCell += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === delimiter) {
                    currentRow.push(currentCell);
                    currentCell = '';
                } else if (char === '\r' && nextChar === '\n') {
                    // Windows 换行
                    currentRow.push(currentCell);
                    rows.push(currentRow);
                    currentRow = [];
                    currentCell = '';
                    i++;
                } else if (char === '\n' || char === '\r') {
                    // Unix 或 Mac 换行
                    currentRow.push(currentCell);
                    rows.push(currentRow);
                    currentRow = [];
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
        }

        // 处理最后一个单元格
        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell);
            rows.push(currentRow);
        }

        // 过滤空行
        return rows.filter(row => row.some(cell => cell.trim() !== ''));
    }

    /**
     * 将数据转换为 CSV 字符串
     * @param {Array<Array<string>>} data - 二维数组
     * @param {string} delimiter - 分隔符
     * @returns {string} - CSV 字符串
     */
    function toCSV(data, delimiter = ',') {
        return data.map(row => {
            return row.map(cell => {
                // 如果包含特殊字符，用引号包裹
                if (cell.includes(delimiter) || cell.includes('"') || cell.includes('\n')) {
                    return '"' + cell.replace(/"/g, '""') + '"';
                }
                return cell;
            }).join(delimiter);
        }).join('\n');
    }

    /**
     * 将 CSV 数据转换为 JSON
     * @param {Array<Array<string>>} data - 二维数组
     * @param {boolean} withHeader - 是否有表头
     * @returns {Array<Object>|Array<Array<string>>} - JSON 数组
     */
    function toJSON(data, withHeader = true) {
        if (!data || data.length === 0) {
            return [];
        }

        if (withHeader && data.length > 1) {
            const headerRow = data[0];
            return data.slice(1).map(row => {
                const obj = {};
                headerRow.forEach((header, index) => {
                    obj[header || `col${index + 1}`] = row[index] || '';
                });
                return obj;
            });
        }

        return data;
    }

    /**
     * 从 JSON 转换为 CSV 数据
     * @param {string} jsonStr - JSON 字符串
     * @returns {Array<Array<string>>} - 二维数组
     */
    function fromJSON(jsonStr) {
        const json = JSON.parse(jsonStr);

        if (!Array.isArray(json)) {
            throw new Error('JSON 必须是数组格式');
        }

        if (json.length === 0) {
            return [];
        }

        // 如果是对象数组
        if (typeof json[0] === 'object' && !Array.isArray(json[0])) {
            const keys = Object.keys(json[0]);
            const rows = [keys];
            json.forEach(obj => {
                rows.push(keys.map(key => String(obj[key] ?? '')));
            });
            return rows;
        }

        // 如果是二维数组
        if (Array.isArray(json[0])) {
            return json.map(row => row.map(cell => String(cell ?? '')));
        }

        // 如果是一维数组
        return json.map(item => [String(item ?? '')]);
    }

    /**
     * 更新统计信息
     */
    function updateStats(data) {
        const statsSection = document.getElementById('stats-section');
        const rowCount = document.getElementById('row-count');
        const colCount = document.getElementById('col-count');
        const cellCount = document.getElementById('cell-count');

        if (statsSection && data && data.length > 0) {
            statsSection.style.display = 'block';
            const rows = hasHeader() ? data.length - 1 : data.length;
            const cols = Math.max(...data.map(row => row.length));
            if (rowCount) rowCount.textContent = rows;
            if (colCount) colCount.textContent = cols;
            if (cellCount) cellCount.textContent = rows * cols;
        } else if (statsSection) {
            statsSection.style.display = 'none';
        }
    }

    /**
     * 渲染表格预览
     */
    function renderTable(data) {
        const tableSection = document.getElementById('table-section');
        const table = document.getElementById('preview-table');

        if (!tableSection || !table || !data || data.length === 0) {
            if (tableSection) tableSection.style.display = 'none';
            return;
        }

        tableSection.style.display = 'block';

        const withHeader = hasHeader();
        let html = '';

        // 表头
        html += '<thead><tr><th class="row-number">#</th>';
        if (withHeader && data.length > 0) {
            data[0].forEach(cell => {
                html += `<th>${escapeHtml(cell)}</th>`;
            });
        } else {
            const cols = Math.max(...data.map(row => row.length));
            for (let i = 0; i < cols; i++) {
                html += `<th>列 ${i + 1}</th>`;
            }
        }
        html += '</tr></thead>';

        // 表体
        html += '<tbody>';
        const startIndex = withHeader ? 1 : 0;
        const displayData = data.slice(startIndex, startIndex + 100); // 限制显示 100 行

        displayData.forEach((row, index) => {
            html += `<tr><td class="row-number">${index + 1}</td>`;
            row.forEach(cell => {
                html += `<td title="${escapeHtml(cell)}">${escapeHtml(cell)}</td>`;
            });
            html += '</tr>';
        });

        if (data.length - startIndex > 100) {
            html += `<tr><td colspan="${data[0].length + 1}" style="text-align: center; color: var(--text-muted);">... 还有 ${data.length - startIndex - 100} 行未显示 ...</td></tr>`;
        }

        html += '</tbody>';
        table.innerHTML = html;
    }

    /**
     * HTML 转义
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * 加载示例数据
     */
    function loadSample() {
        return `name,age,email,city
张三,25,zhangsan@example.com,北京
李四,30,lisi@example.com,上海
王五,28,wangwu@example.com,广州
"赵六,Jr.",22,zhaoliu@example.com,深圳
孙七,35,sunqi@example.com,"成都,四川"`;
    }

    /**
     * 下载 CSV 文件
     */
    function downloadCSV() {
        if (!parsedData || parsedData.length === 0) {
            REOT.utils?.showNotification('没有可下载的数据', 'warning');
            return;
        }

        const delimiter = getDelimiter();
        const csv = toCSV(parsedData, delimiter);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    // 事件处理
    document.addEventListener('change', (e) => {
        if (!isCsvToolActive()) return;

        // 分隔符选择
        if (e.target.id === 'delimiter-select') {
            const customGroup = document.getElementById('custom-delimiter-group');
            if (customGroup) {
                customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
            }
        }

        // 文件上传
        if (e.target.id === 'file-input') {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setInputValue(event.target.result);
                };
                reader.readAsText(file);
            }
        }
    });

    document.addEventListener('click', async (e) => {
        if (!isCsvToolActive()) return;

        const target = e.target;

        // 加载示例
        if (target.id === 'sample-btn' || target.closest('#sample-btn')) {
            setInputValue(loadSample());
        }

        // 解析 CSV
        if (target.id === 'parse-btn' || target.closest('#parse-btn')) {
            const inputValue = getInputValue();
            if (!inputValue.trim()) {
                REOT.utils?.showNotification('请输入 CSV 内容', 'warning');
                return;
            }

            try {
                const delimiter = getDelimiter();
                parsedData = parseCSV(inputValue, delimiter);
                updateStats(parsedData);
                renderTable(parsedData);
                REOT.utils?.showNotification('解析成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('解析失败: ' + error.message, 'error');
            }
        }

        // 转为 JSON
        if (target.id === 'to-json-btn' || target.closest('#to-json-btn')) {
            const inputValue = getInputValue();
            const jsonSection = document.getElementById('json-output-section');

            if (!inputValue.trim()) {
                REOT.utils?.showNotification('请输入 CSV 内容', 'warning');
                return;
            }

            try {
                const delimiter = getDelimiter();
                parsedData = parseCSV(inputValue, delimiter);
                const json = toJSON(parsedData, hasHeader());

                setJsonOutputValue(JSON.stringify(json, null, 2));
                if (jsonSection) {
                    jsonSection.style.display = 'block';
                }

                updateStats(parsedData);
                renderTable(parsedData);
                REOT.utils?.showNotification('转换成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('转换失败: ' + error.message, 'error');
            }
        }

        // 从 JSON 转换
        if (target.id === 'from-json-btn' || target.closest('#from-json-btn')) {
            const inputValue = getInputValue();
            if (!inputValue.trim()) {
                REOT.utils?.showNotification('请输入 JSON 内容', 'warning');
                return;
            }

            try {
                parsedData = fromJSON(inputValue);
                const delimiter = getDelimiter();
                setInputValue(toCSV(parsedData, delimiter));

                updateStats(parsedData);
                renderTable(parsedData);
                REOT.utils?.showNotification('转换成功', 'success');
            } catch (error) {
                REOT.utils?.showNotification('JSON 解析失败: ' + error.message, 'error');
            }
        }

        // 清除
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const jsonSection = document.getElementById('json-output-section');
            const tableSection = document.getElementById('table-section');
            const statsSection = document.getElementById('stats-section');

            setInputValue('');
            setJsonOutputValue('');
            if (jsonSection) jsonSection.style.display = 'none';
            if (tableSection) tableSection.style.display = 'none';
            if (statsSection) statsSection.style.display = 'none';
            parsedData = null;
        }

        // 复制
        if (target.id === 'copy-btn' || target.closest('#copy-btn')) {
            const jsonOutputValue = getJsonOutputValue();
            const textToCopy = jsonOutputValue || getInputValue();

            if (textToCopy) {
                const success = await REOT.utils?.copyToClipboard(textToCopy);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        }

        // 下载 CSV
        if (target.id === 'download-csv-btn' || target.closest('#download-csv-btn')) {
            downloadCSV();
        }
    });

    // 导出工具函数
    window.CSVTool = { parseCSV, toCSV, toJSON, fromJSON };

    /**
     * 初始化 CodeMirror 编辑器
     */
    async function initEditors() {
        if (!REOT.CodeEditor) {
            console.warn('CodeEditor not available, using textarea fallback');
            const inputEl = document.getElementById('input');
            const jsonOutputEl = document.getElementById('json-output');
            if (inputEl) inputEl.style.display = 'block';
            if (jsonOutputEl) jsonOutputEl.style.display = 'block';
            return;
        }

        try {
            const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

            // 创建输入编辑器 (CSV 没有专门的语言支持，使用普通文本)
            inputEditor = await REOT.CodeEditor.create('#input-editor', {
                language: null,
                value: '',
                readOnly: false,
                theme: theme
            });

            // 创建 JSON 输出编辑器（只读）
            jsonOutputEditor = await REOT.CodeEditor.create('#json-output-editor', {
                language: 'json',
                value: '',
                readOnly: true,
                theme: theme
            });

            console.log('CSV editors initialized');
        } catch (error) {
            console.error('Failed to initialize editors:', error);
            const inputEl = document.getElementById('input');
            const jsonOutputEl = document.getElementById('json-output');
            if (inputEl) inputEl.style.display = 'block';
            if (jsonOutputEl) jsonOutputEl.style.display = 'block';
        }
    }

    // 初始化编辑器
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (isCsvToolActive()) {
                initEditors();
            }
        });
    } else {
        if (isCsvToolActive()) {
            initEditors();
        }
    }

    // 监听路由变化重新初始化
    window.addEventListener('routeChange', () => {
        if (isCsvToolActive() && !inputEditor) {
            initEditors();
        }
    });

})();
