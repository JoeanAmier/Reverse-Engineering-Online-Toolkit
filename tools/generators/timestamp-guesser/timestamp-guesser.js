/**
 * 时间戳格式猜测工具
 * @description 自动识别时间戳格式
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // 时间戳格式定义
    const TIMESTAMP_FORMATS = [
        {
            id: 'unix-seconds',
            name: 'Unix 时间戳 (秒)',
            nameEn: 'Unix Timestamp (seconds)',
            epoch: new Date('1970-01-01T00:00:00Z'),
            divisor: 1,
            minDigits: 9,
            maxDigits: 10,
            minValue: 0,
            maxValue: 4102444800, // 2100-01-01
            convert: (v) => new Date(v * 1000)
        },
        {
            id: 'unix-milliseconds',
            name: 'Unix 时间戳 (毫秒)',
            nameEn: 'Unix Timestamp (milliseconds)',
            epoch: new Date('1970-01-01T00:00:00Z'),
            divisor: 1000,
            minDigits: 12,
            maxDigits: 13,
            minValue: 0,
            maxValue: 4102444800000,
            convert: (v) => new Date(v)
        },
        {
            id: 'unix-microseconds',
            name: 'Unix 时间戳 (微秒)',
            nameEn: 'Unix Timestamp (microseconds)',
            epoch: new Date('1970-01-01T00:00:00Z'),
            divisor: 1000000,
            minDigits: 15,
            maxDigits: 16,
            minValue: 0,
            maxValue: 4102444800000000,
            convert: (v) => new Date(v / 1000)
        },
        {
            id: 'unix-nanoseconds',
            name: 'Unix 时间戳 (纳秒)',
            nameEn: 'Unix Timestamp (nanoseconds)',
            epoch: new Date('1970-01-01T00:00:00Z'),
            divisor: 1000000000,
            minDigits: 18,
            maxDigits: 19,
            minValue: 0,
            maxValue: 4102444800000000000n,
            convert: (v) => new Date(Number(BigInt(v) / 1000000n))
        },
        {
            id: 'excel-date',
            name: 'Excel/OLE 日期',
            nameEn: 'Excel/OLE Date',
            epoch: new Date('1899-12-30T00:00:00Z'),
            minDigits: 1,
            maxDigits: 6,
            minValue: 1,
            maxValue: 100000,
            convert: (v) => {
                const days = parseFloat(v);
                const ms = (days - 25569) * 86400000;
                return new Date(ms);
            }
        },
        {
            id: 'ldap-filetime',
            name: 'LDAP/Windows FILETIME',
            nameEn: 'LDAP/Windows FILETIME',
            epoch: new Date('1601-01-01T00:00:00Z'),
            divisor: 10000000,
            minDigits: 17,
            maxDigits: 18,
            minValue: 116444736000000000n,
            maxValue: 159000000000000000n,
            convert: (v) => {
                const ticks = BigInt(v);
                const unixMs = Number((ticks - 116444736000000000n) / 10000n);
                return new Date(unixMs);
            }
        },
        {
            id: 'webkit-chrome',
            name: 'WebKit/Chrome 时间戳',
            nameEn: 'WebKit/Chrome Timestamp',
            epoch: new Date('1601-01-01T00:00:00Z'),
            divisor: 1000000,
            minDigits: 16,
            maxDigits: 17,
            minValue: 11644473600000000,
            maxValue: 15900000000000000,
            convert: (v) => {
                const microseconds = BigInt(v);
                const unixMs = Number((microseconds - 11644473600000000n) / 1000n);
                return new Date(unixMs);
            }
        },
        {
            id: 'mac-hfs-plus',
            name: 'Mac HFS+ 时间戳',
            nameEn: 'Mac HFS+ Timestamp',
            epoch: new Date('1904-01-01T00:00:00Z'),
            divisor: 1,
            minDigits: 9,
            maxDigits: 10,
            minValue: 2082844800,
            maxValue: 6000000000,
            convert: (v) => {
                const seconds = parseInt(v);
                const unixMs = (seconds - 2082844800) * 1000;
                return new Date(unixMs);
            }
        },
        {
            id: 'cocoa-nsdate',
            name: 'Cocoa/NSDate 时间戳',
            nameEn: 'Cocoa/NSDate Timestamp',
            epoch: new Date('2001-01-01T00:00:00Z'),
            divisor: 1,
            minDigits: 9,
            maxDigits: 10,
            minValue: -1000000000,
            maxValue: 2000000000,
            convert: (v) => {
                const seconds = parseFloat(v);
                const unixMs = (seconds + 978307200) * 1000;
                return new Date(unixMs);
            }
        },
        {
            id: 'java-nanotime',
            name: 'Java nanoTime',
            nameEn: 'Java nanoTime',
            epoch: null,
            minDigits: 15,
            maxDigits: 19,
            minValue: 0,
            maxValue: 9223372036854775807n,
            convert: null,
            note: '相对值，无法转换为绝对时间',
            noteEn: 'Relative value, cannot convert to absolute time'
        }
    ];

    // DOM 元素
    const timestampInput = document.getElementById('timestamp-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const nowBtn = document.getElementById('now-btn');
    const resultsSection = document.getElementById('results-section');
    const resultsList = document.getElementById('results-list');

    /**
     * 分析时间戳
     */
    function analyzeTimestamp(input) {
        input = input.trim();

        if (!input) {
            return [];
        }

        // 尝试解析为数字
        let value;
        let isFloat = input.includes('.');

        if (isFloat) {
            value = parseFloat(input);
        } else {
            try {
                value = BigInt(input);
            } catch {
                value = parseInt(input, 10);
            }
        }

        if ((typeof value === 'bigint' && value < 0n) ||
            (typeof value === 'number' && (isNaN(value) || !isFinite(value)))) {
            return [];
        }

        const results = [];
        const now = Date.now();
        const digitCount = input.replace('.', '').replace('-', '').length;

        for (const format of TIMESTAMP_FORMATS) {
            // 检查位数范围
            if (digitCount < format.minDigits || digitCount > format.maxDigits) {
                continue;
            }

            // 检查值范围
            let numValue = typeof value === 'bigint' ? value : BigInt(Math.floor(value));
            let minVal = typeof format.minValue === 'bigint' ? format.minValue : BigInt(format.minValue);
            let maxVal = typeof format.maxValue === 'bigint' ? format.maxValue : BigInt(format.maxValue);

            if (numValue < minVal || numValue > maxVal) {
                continue;
            }

            // 尝试转换
            let convertedDate = null;
            let isReasonable = false;

            if (format.convert) {
                try {
                    convertedDate = format.convert(value);

                    // 检查日期是否合理 (1970-2100)
                    if (convertedDate && !isNaN(convertedDate.getTime())) {
                        const year = convertedDate.getFullYear();
                        isReasonable = year >= 1970 && year <= 2100;
                    }
                } catch (e) {
                    continue;
                }
            }

            // 计算可信度
            let confidence = 50;

            if (isReasonable) {
                confidence += 30;

                // 如果接近当前时间，可信度更高
                if (convertedDate) {
                    const diffDays = Math.abs(convertedDate.getTime() - now) / 86400000;
                    if (diffDays < 365) confidence += 15;
                    else if (diffDays < 3650) confidence += 10;
                }
            }

            // 特定格式的额外检查
            if (format.id === 'unix-seconds' && digitCount === 10) {
                confidence += 10;
            } else if (format.id === 'unix-milliseconds' && digitCount === 13) {
                confidence += 10;
            } else if (format.id === 'excel-date' && isFloat) {
                confidence += 15;
            }

            results.push({
                format: format,
                value: value,
                convertedDate: convertedDate,
                confidence: Math.min(confidence, 100),
                isReasonable: isReasonable
            });
        }

        // 按可信度排序
        results.sort((a, b) => b.confidence - a.confidence);

        return results;
    }

    /**
     * 格式化日期显示
     */
    function formatDate(date) {
        if (!date || isNaN(date.getTime())) {
            return '-';
        }

        const iso = date.toISOString();
        const local = date.toLocaleString();

        return `${local} (${iso})`;
    }

    /**
     * 渲染结果
     */
    function renderResults(results) {
        if (results.length === 0) {
            resultsSection.style.display = 'none';
            return;
        }

        const isEnglish = REOT.i18n?.currentLang === 'en-US';

        resultsList.innerHTML = results.map((result, index) => {
            const format = result.format;
            const name = isEnglish ? format.nameEn : format.name;
            const confidenceClass = result.confidence >= 80 ? 'high' :
                                   result.confidence >= 50 ? 'medium' : 'low';

            let dateDisplay = '-';
            if (result.convertedDate && !isNaN(result.convertedDate.getTime())) {
                dateDisplay = formatDate(result.convertedDate);
            } else if (format.note) {
                dateDisplay = isEnglish ? format.noteEn : format.note;
            }

            return `
                <div class="result-card ${index === 0 ? 'result-card--best' : ''}">
                    <div class="result-header">
                        <span class="result-format">${name}</span>
                        <span class="result-confidence confidence--${confidenceClass}">
                            ${result.confidence}% ${isEnglish ? 'confidence' : '可信度'}
                        </span>
                    </div>
                    <div class="result-body">
                        <div class="result-row">
                            <span class="result-label">${isEnglish ? 'Converted Time' : '转换时间'}</span>
                            <span class="result-value">${dateDisplay}</span>
                        </div>
                        ${result.isReasonable ? `
                        <div class="result-row">
                            <span class="result-label">${isEnglish ? 'Status' : '状态'}</span>
                            <span class="result-value result-value--success">✓ ${isEnglish ? 'Reasonable date range' : '合理的日期范围'}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        resultsSection.style.display = 'block';
    }

    /**
     * 执行分析
     */
    function executeAnalysis() {
        const input = timestampInput.value;
        const results = analyzeTimestamp(input);
        renderResults(results);
    }

    // 事件绑定
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', executeAnalysis);
    }

    if (timestampInput) {
        timestampInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                executeAnalysis();
            }
        });

        // 实时分析（输入停止后 300ms）
        let debounceTimer;
        timestampInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(executeAnalysis, 300);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            timestampInput.value = '';
            resultsSection.style.display = 'none';
        });
    }

    if (nowBtn) {
        nowBtn.addEventListener('click', () => {
            timestampInput.value = Date.now().toString();
            executeAnalysis();
        });
    }

    // 初始化 - 显示当前时间戳
    if (timestampInput) {
        timestampInput.value = Date.now().toString();
        executeAnalysis();
    }

    // 导出到全局
    window.TimestampGuesserTool = {
        analyzeTimestamp,
        TIMESTAMP_FORMATS
    };
})();
