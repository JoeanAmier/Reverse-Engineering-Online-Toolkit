/**
 * ULID 生成器和解析器
 * @description 生成和解析 ULID (Universally Unique Lexicographically Sortable Identifier)
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // Crockford's Base32 字符集 (排除 I, L, O, U 避免混淆)
    const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    const ENCODING_LEN = ENCODING.length;
    const TIME_LEN = 10;
    const RANDOM_LEN = 16;
    const ULID_LEN = TIME_LEN + RANDOM_LEN;

    // 解码映射表
    const DECODE_MAP = {};
    for (let i = 0; i < ENCODING_LEN; i++) {
        DECODE_MAP[ENCODING[i]] = i;
        DECODE_MAP[ENCODING[i].toLowerCase()] = i;
    }
    // 处理相似字符
    DECODE_MAP['I'] = 1;
    DECODE_MAP['i'] = 1;
    DECODE_MAP['L'] = 1;
    DECODE_MAP['l'] = 1;
    DECODE_MAP['O'] = 0;
    DECODE_MAP['o'] = 0;

    // DOM 元素 - 生成面板
    const genCountInput = document.getElementById('gen-count');
    const genCaseSelect = document.getElementById('gen-case');
    const genTimeInput = document.getElementById('gen-time');
    const genBtn = document.getElementById('gen-btn');
    const genClearBtn = document.getElementById('gen-clear-btn');
    const genOutput = document.getElementById('gen-output');
    const genCopyBtn = document.getElementById('gen-copy-btn');
    const genDownloadBtn = document.getElementById('gen-download-btn');

    // DOM 元素 - 解析面板
    const parseInput = document.getElementById('parse-input');
    const parseBtn = document.getElementById('parse-btn');
    const parseClearBtn = document.getElementById('parse-clear-btn');
    const parseResult = document.getElementById('parse-result');
    const visualSection = document.getElementById('visual-section');

    // 结果显示元素
    const resultUlid = document.getElementById('result-ulid');
    const resultTimestamp = document.getElementById('result-timestamp');
    const resultDatetime = document.getElementById('result-datetime');
    const resultRandom = document.getElementById('result-random');
    const resultBinary = document.getElementById('result-binary');
    const resultUuid = document.getElementById('result-uuid');
    const visualTime = document.getElementById('visual-time');
    const visualRandom = document.getElementById('visual-random');

    // 模式标签页
    const modeTabs = document.querySelectorAll('.mode-tab');
    const modePanels = document.querySelectorAll('.mode-panel');

    /**
     * 生成加密安全的随机字节
     */
    function randomBytes(length) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
    }

    /**
     * 将时间戳编码为 Base32 (10 个字符)
     */
    function encodeTime(timestamp, len) {
        let result = '';
        for (let i = len - 1; i >= 0; i--) {
            result = ENCODING[timestamp % ENCODING_LEN] + result;
            timestamp = Math.floor(timestamp / ENCODING_LEN);
        }
        return result;
    }

    /**
     * 将随机字节编码为 Base32 (16 个字符)
     */
    function encodeRandom(bytes) {
        // 将 10 字节转换为 16 个 Base32 字符
        let result = '';

        // 每 5 位编码为一个字符
        // 10 字节 = 80 位 = 16 个 5 位组
        const bits = [];
        for (let i = 0; i < bytes.length; i++) {
            for (let j = 7; j >= 0; j--) {
                bits.push((bytes[i] >> j) & 1);
            }
        }

        for (let i = 0; i < 16; i++) {
            const start = i * 5;
            let value = 0;
            for (let j = 0; j < 5; j++) {
                value = (value << 1) | bits[start + j];
            }
            result += ENCODING[value];
        }

        return result;
    }

    /**
     * 生成 ULID
     */
    function generateULID(timestamp = Date.now()) {
        const timePart = encodeTime(timestamp, TIME_LEN);
        const randomPart = encodeRandom(randomBytes(10));
        return timePart + randomPart;
    }

    /**
     * 解码 ULID 的时间戳部分
     */
    function decodeTime(ulid) {
        const timePart = ulid.slice(0, TIME_LEN);
        let timestamp = 0;

        for (let i = 0; i < TIME_LEN; i++) {
            const char = timePart[i];
            const value = DECODE_MAP[char];
            if (value === undefined) {
                throw new Error(`Invalid character: ${char}`);
            }
            timestamp = timestamp * ENCODING_LEN + value;
        }

        return timestamp;
    }

    /**
     * 解码 ULID 的随机部分为十六进制
     */
    function decodeRandom(ulid) {
        const randomPart = ulid.slice(TIME_LEN);
        const bits = [];

        for (let i = 0; i < RANDOM_LEN; i++) {
            const char = randomPart[i];
            const value = DECODE_MAP[char];
            if (value === undefined) {
                throw new Error(`Invalid character: ${char}`);
            }
            for (let j = 4; j >= 0; j--) {
                bits.push((value >> j) & 1);
            }
        }

        // 将 80 位转换为 10 字节
        let hex = '';
        for (let i = 0; i < 10; i++) {
            const start = i * 8;
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                byte = (byte << 1) | bits[start + j];
            }
            hex += byte.toString(16).padStart(2, '0');
        }

        return hex.toUpperCase();
    }

    /**
     * 将 ULID 转换为 UUID 格式
     */
    function ulidToUuid(ulid) {
        const timestamp = decodeTime(ulid);
        const randomHex = decodeRandom(ulid);

        // 将时间戳转换为 6 字节十六进制
        const timeHex = timestamp.toString(16).padStart(12, '0');

        // 组合成 UUID 格式 (不是标准 UUID，只是格式化展示)
        const hex = timeHex + randomHex;
        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20, 32)
        ].join('-').toLowerCase();
    }

    /**
     * 将 ULID 转换为二进制字符串
     */
    function ulidToBinary(ulid) {
        const timestamp = decodeTime(ulid);
        const timeBits = timestamp.toString(2).padStart(48, '0');

        const randomPart = ulid.slice(TIME_LEN);
        let randomBits = '';
        for (let i = 0; i < RANDOM_LEN; i++) {
            const value = DECODE_MAP[randomPart[i]];
            randomBits += value.toString(2).padStart(5, '0');
        }

        return timeBits + randomBits;
    }

    /**
     * 验证 ULID 格式
     */
    function isValidULID(ulid) {
        if (!ulid || typeof ulid !== 'string') {
            return false;
        }

        if (ulid.length !== ULID_LEN) {
            return false;
        }

        for (let i = 0; i < ulid.length; i++) {
            if (DECODE_MAP[ulid[i]] === undefined) {
                return false;
            }
        }

        return true;
    }

    /**
     * 解析 ULID
     */
    function parseULID(ulid) {
        ulid = ulid.toUpperCase().trim();

        if (!isValidULID(ulid)) {
            throw new Error('Invalid ULID format');
        }

        const timestamp = decodeTime(ulid);
        const datetime = new Date(timestamp);
        const randomHex = decodeRandom(ulid);
        const binary = ulidToBinary(ulid);
        const uuid = ulidToUuid(ulid);

        return {
            ulid: ulid,
            timestamp: timestamp,
            datetime: datetime.toISOString(),
            datetimeLocal: datetime.toLocaleString(),
            randomHex: randomHex,
            binary: binary,
            uuid: uuid,
            timePart: ulid.slice(0, TIME_LEN),
            randomPart: ulid.slice(TIME_LEN)
        };
    }

    /**
     * 执行生成
     */
    function executeGenerate() {
        const count = Math.min(Math.max(parseInt(genCountInput.value, 10) || 1, 1), 100);
        const useUppercase = genCaseSelect.value === 'upper';

        let timestamp = Date.now();
        if (genTimeInput.value) {
            const customDate = new Date(genTimeInput.value);
            if (!isNaN(customDate.getTime())) {
                timestamp = customDate.getTime();
            }
        }

        const ulids = [];
        for (let i = 0; i < count; i++) {
            let ulid = generateULID(timestamp);
            if (!useUppercase) {
                ulid = ulid.toLowerCase();
            }
            ulids.push(ulid);
        }

        genOutput.value = ulids.join('\n');
    }

    /**
     * 执行解析
     */
    function executeParse() {
        const input = parseInput.value.trim();

        if (!input) {
            parseResult.style.display = 'none';
            visualSection.style.display = 'none';
            return;
        }

        try {
            const result = parseULID(input);

            resultUlid.textContent = result.ulid;
            resultTimestamp.textContent = result.timestamp;
            resultDatetime.textContent = result.datetimeLocal + ' (' + result.datetime + ')';
            resultRandom.textContent = result.randomHex;
            resultBinary.textContent = result.binary.slice(0, 48) + ' ' + result.binary.slice(48);
            resultUuid.textContent = result.uuid;

            visualTime.textContent = result.timePart;
            visualRandom.textContent = result.randomPart;

            parseResult.style.display = 'block';
            visualSection.style.display = 'block';
        } catch (error) {
            resultUlid.textContent = REOT.i18n?.t('tools.ulid.invalidFormat') || '无效的 ULID 格式';
            resultTimestamp.textContent = '-';
            resultDatetime.textContent = '-';
            resultRandom.textContent = '-';
            resultBinary.textContent = '-';
            resultUuid.textContent = '-';

            parseResult.style.display = 'block';
            visualSection.style.display = 'none';
        }
    }

    // 模式切换
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.dataset.mode;

            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            modePanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === mode + '-panel') {
                    panel.classList.add('active');
                }
            });
        });
    });

    // 生成按钮
    if (genBtn) {
        genBtn.addEventListener('click', executeGenerate);
    }

    // 清除按钮 - 生成
    if (genClearBtn) {
        genClearBtn.addEventListener('click', () => {
            genOutput.value = '';
            genTimeInput.value = '';
        });
    }

    // 复制按钮
    if (genCopyBtn) {
        genCopyBtn.addEventListener('click', async () => {
            if (genOutput.value) {
                const success = await REOT.utils?.copyToClipboard(genOutput.value);
                if (success) {
                    REOT.utils?.showNotification(REOT.i18n?.t('common.copied') || '已复制', 'success');
                }
            }
        });
    }

    // 下载按钮
    if (genDownloadBtn) {
        genDownloadBtn.addEventListener('click', () => {
            if (genOutput.value) {
                const blob = new Blob([genOutput.value], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ulids.txt';
                a.click();
                URL.revokeObjectURL(url);
            }
        });
    }

    // 解析按钮
    if (parseBtn) {
        parseBtn.addEventListener('click', executeParse);
    }

    // 实时解析
    if (parseInput) {
        parseInput.addEventListener('input', () => {
            if (parseInput.value.trim().length === ULID_LEN) {
                executeParse();
            }
        });
    }

    // 清除按钮 - 解析
    if (parseClearBtn) {
        parseClearBtn.addEventListener('click', () => {
            parseInput.value = '';
            parseResult.style.display = 'none';
            visualSection.style.display = 'none';
        });
    }

    // 初始化 - 生成一个默认 ULID
    executeGenerate();

    // 导出到全局
    window.ULIDTool = {
        generateULID,
        parseULID,
        isValidULID,
        ulidToUuid
    };
})();
