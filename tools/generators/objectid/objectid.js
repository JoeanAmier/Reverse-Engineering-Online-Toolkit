/**
 * MongoDB ObjectID 生成器和解析器
 * @description 生成和解析 MongoDB ObjectID
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // ObjectID 常量
    const OBJECTID_LEN = 24; // 24 个十六进制字符 (12 字节)

    // 模拟的机器标识和进程 ID (5 字节随机值)
    let machineId = null;
    let counter = Math.floor(Math.random() * 0xFFFFFF);

    /**
     * 初始化机器标识 (5 字节随机值)
     */
    function initMachineId() {
        if (!machineId) {
            const bytes = new Uint8Array(5);
            crypto.getRandomValues(bytes);
            machineId = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return machineId;
    }

    /**
     * 获取下一个计数器值 (3 字节)
     */
    function getNextCounter() {
        counter = (counter + 1) & 0xFFFFFF;
        return counter;
    }

    /**
     * 生成 ObjectID
     * @param {number} timestamp - Unix 时间戳 (秒)
     */
    function generateObjectID(timestamp = null) {
        // 4 字节时间戳 (秒)
        const ts = timestamp || Math.floor(Date.now() / 1000);
        const timePart = ts.toString(16).padStart(8, '0');

        // 5 字节随机值 (机器标识 + 进程 ID)
        const randomPart = initMachineId();

        // 3 字节计数器
        const counterPart = getNextCounter().toString(16).padStart(6, '0');

        return (timePart + randomPart + counterPart).toLowerCase();
    }

    /**
     * 验证 ObjectID 格式
     */
    function isValidObjectID(id) {
        if (!id || typeof id !== 'string') {
            return false;
        }

        if (id.length !== OBJECTID_LEN) {
            return false;
        }

        return /^[0-9a-fA-F]{24}$/.test(id);
    }

    /**
     * 解析 ObjectID
     */
    function parseObjectID(id) {
        id = id.toLowerCase().trim();

        if (!isValidObjectID(id)) {
            throw new Error('Invalid ObjectID format');
        }

        // 解析各部分
        const timePart = id.slice(0, 8);
        const randomPart = id.slice(8, 18);
        const counterPart = id.slice(18, 24);

        // 解析时间戳 (4 字节)
        const timestamp = parseInt(timePart, 16);
        const datetime = new Date(timestamp * 1000);

        // 解析机器标识 (3 字节) 和进程 ID (2 字节)
        const machineHex = randomPart.slice(0, 6);
        const processHex = randomPart.slice(6, 10);
        const machineIdValue = parseInt(machineHex, 16);
        const processIdValue = parseInt(processHex, 16);

        // 解析计数器 (3 字节)
        const counterValue = parseInt(counterPart, 16);

        return {
            id: id,
            timestamp: timestamp,
            datetime: datetime.toISOString(),
            datetimeLocal: datetime.toLocaleString(),
            machineId: machineHex.toUpperCase(),
            machineIdDecimal: machineIdValue,
            processId: processHex.toUpperCase(),
            processIdDecimal: processIdValue,
            counter: counterPart.toUpperCase(),
            counterDecimal: counterValue,
            timePart: timePart.toUpperCase(),
            randomPart: randomPart.toUpperCase(),
            counterPartHex: counterPart.toUpperCase()
        };
    }

    // DOM 元素 - 生成面板
    const genCountInput = document.getElementById('gen-count');
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
    const resultId = document.getElementById('result-id');
    const resultTimestamp = document.getElementById('result-timestamp');
    const resultDatetime = document.getElementById('result-datetime');
    const resultMachine = document.getElementById('result-machine');
    const resultProcess = document.getElementById('result-process');
    const resultCounter = document.getElementById('result-counter');
    const visualTime = document.getElementById('visual-time');
    const visualRandom = document.getElementById('visual-random');
    const visualCounter = document.getElementById('visual-counter');

    // 模式标签页
    const modeTabs = document.querySelectorAll('.mode-tab');
    const modePanels = document.querySelectorAll('.mode-panel');

    /**
     * 执行生成
     */
    function executeGenerate() {
        const count = Math.min(Math.max(parseInt(genCountInput.value, 10) || 1, 1), 100);

        let timestamp = null;
        if (genTimeInput.value) {
            const customDate = new Date(genTimeInput.value);
            if (!isNaN(customDate.getTime())) {
                timestamp = Math.floor(customDate.getTime() / 1000);
            }
        }

        const ids = [];
        for (let i = 0; i < count; i++) {
            ids.push(generateObjectID(timestamp));
        }

        genOutput.value = ids.join('\n');
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
            const result = parseObjectID(input);

            resultId.textContent = result.id;
            resultTimestamp.textContent = result.timestamp + ' (' + result.datetime + ')';
            resultDatetime.textContent = result.datetimeLocal;
            resultMachine.textContent = result.machineId + ' (' + result.machineIdDecimal + ')';
            resultProcess.textContent = result.processId + ' (' + result.processIdDecimal + ')';
            resultCounter.textContent = result.counter + ' (' + result.counterDecimal + ')';

            visualTime.textContent = result.timePart;
            visualRandom.textContent = result.randomPart;
            visualCounter.textContent = result.counterPartHex;

            parseResult.style.display = 'block';
            visualSection.style.display = 'block';
        } catch (error) {
            resultId.textContent = REOT.i18n?.t('tools.objectid.invalidFormat') || '无效的 ObjectID 格式';
            resultTimestamp.textContent = '-';
            resultDatetime.textContent = '-';
            resultMachine.textContent = '-';
            resultProcess.textContent = '-';
            resultCounter.textContent = '-';

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
                a.download = 'objectids.txt';
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
            if (parseInput.value.trim().length === OBJECTID_LEN) {
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

    // 初始化 - 生成一个默认 ObjectID
    executeGenerate();

    // 导出到全局
    window.ObjectIDTool = {
        generateObjectID,
        parseObjectID,
        isValidObjectID
    };
})();
