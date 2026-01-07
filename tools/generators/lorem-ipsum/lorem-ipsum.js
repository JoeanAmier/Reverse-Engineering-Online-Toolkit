/**
 * Lorem Ipsum生成器
 * @description 生成占位文本
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // Lorem Ipsum 词库
    const WORDS = [
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
        'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
        'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
        'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
        'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
        'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
        'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
        'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'perspiciatis', 'unde',
        'omnis', 'iste', 'natus', 'error', 'voluptatem', 'accusantium', 'doloremque',
        'laudantium', 'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo',
        'inventore', 'veritatis', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta',
        'explicabo', 'nemo', 'ipsam', 'quia', 'voluptas', 'aspernatur', 'aut', 'odit',
        'fugit', 'consequuntur', 'magni', 'dolores', 'eos', 'ratione', 'sequi',
        'nesciunt', 'neque', 'porro', 'quisquam', 'dolorem', 'adipisci', 'numquam',
        'eius', 'modi', 'tempora', 'magnam', 'quaerat', 'minima', 'nostrum',
        'exercitationem', 'ullam', 'corporis', 'suscipit', 'laboriosam', 'aliquid',
        'commodi', 'consequatur', 'autem', 'vel', 'eum', 'iure', 'quam', 'nihil',
        'molestiae', 'illum', 'quo', 'voluptas', 'nulla', 'recusandae', 'itaque',
        'earum', 'rerum', 'hic', 'tenetur', 'sapiente', 'delectus', 'reiciendis',
        'voluptatibus', 'maiores', 'alias', 'perferendis', 'doloribus', 'asperiores',
        'repellat', 'temporibus', 'quibusdam', 'officiis', 'debitis', 'necessitatibus',
        'saepe', 'eveniet', 'voluptates', 'repudiandae', 'molestias', 'excepturi',
        'libero', 'recusandae', 'provident', 'similique', 'mollitia', 'animi',
        'blanditiis', 'praesentium', 'deleniti', 'atque', 'corrupti', 'quos',
        'quas', 'obcaecati', 'praesentium', 'sint', 'inventore'
    ];

    // 经典开头
    const CLASSIC_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';

    /**
     * 获取随机单词
     */
    function getRandomWord() {
        return WORDS[Math.floor(Math.random() * WORDS.length)];
    }

    /**
     * 生成单词列表
     */
    function generateWords(count) {
        const words = [];
        for (let i = 0; i < count; i++) {
            words.push(getRandomWord());
        }
        return words;
    }

    /**
     * 生成句子
     */
    function generateSentence(minWords = 5, maxWords = 15) {
        const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
        const words = generateWords(wordCount);

        // 首字母大写
        words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);

        // 随机添加逗号
        for (let i = 3; i < words.length - 2; i++) {
            if (Math.random() < 0.2) {
                words[i] += ',';
            }
        }

        return words.join(' ') + '.';
    }

    /**
     * 生成段落
     */
    function generateParagraph(minSentences = 3, maxSentences = 7) {
        const sentenceCount = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;
        const sentences = [];

        for (let i = 0; i < sentenceCount; i++) {
            sentences.push(generateSentence());
        }

        return sentences.join(' ');
    }

    /**
     * 生成文本
     */
    function generate(type, count, startWithLorem) {
        const result = [];

        if (type === 'words') {
            const words = generateWords(count);
            if (startWithLorem && count >= 2) {
                words[0] = 'Lorem';
                words[1] = 'ipsum';
            }
            return {
                text: words.join(' '),
                paragraphs: 0,
                sentences: 0,
                words: count,
                characters: words.join(' ').length
            };
        }

        if (type === 'sentences') {
            for (let i = 0; i < count; i++) {
                if (i === 0 && startWithLorem) {
                    result.push(CLASSIC_START + '.');
                } else {
                    result.push(generateSentence());
                }
            }
            const text = result.join(' ');
            return {
                text: text,
                paragraphs: 0,
                sentences: count,
                words: text.split(/\s+/).length,
                characters: text.length
            };
        }

        // paragraphs
        for (let i = 0; i < count; i++) {
            if (i === 0 && startWithLorem) {
                const rest = generateParagraph(2, 5);
                result.push(CLASSIC_START + '. ' + rest);
            } else {
                result.push(generateParagraph());
            }
        }

        const text = result.join('\n\n');
        return {
            text: text,
            html: result.map(p => `<p>${p}</p>`).join(''),
            paragraphs: count,
            sentences: result.reduce((acc, p) => acc + (p.match(/\./g) || []).length, 0),
            words: text.split(/\s+/).length,
            characters: text.length
        };
    }

    // DOM 元素
    const genType = document.getElementById('gen-type');
    const genCount = document.getElementById('gen-count');
    const startLorem = document.getElementById('start-lorem');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const resultStats = document.getElementById('result-stats');
    const resultOutput = document.getElementById('result-output');

    let currentText = '';

    /**
     * 执行生成
     */
    function doGenerate() {
        const type = genType.value;
        const count = parseInt(genCount.value) || 1;
        const withLorem = startLorem.checked;

        const result = generate(type, count, withLorem);
        currentText = result.text;

        // 显示统计
        const t = window.REOT?.i18n?.t || (key => key.split('.').pop());
        resultStats.innerHTML = `
            <span class="stat-item">${t('tools.lorem-ipsum.statParagraphs')}: <span class="stat-value">${result.paragraphs}</span></span>
            <span class="stat-item">${t('tools.lorem-ipsum.statSentences')}: <span class="stat-value">${result.sentences}</span></span>
            <span class="stat-item">${t('tools.lorem-ipsum.statWords')}: <span class="stat-value">${result.words}</span></span>
            <span class="stat-item">${t('tools.lorem-ipsum.statCharacters')}: <span class="stat-value">${result.characters}</span></span>
        `;

        // 显示内容
        if (result.html) {
            resultOutput.innerHTML = result.html;
        } else {
            resultOutput.textContent = result.text;
        }
    }

    /**
     * 复制结果
     */
    function copyResult() {
        if (currentText) {
            navigator.clipboard.writeText(currentText).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '已复制!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 1500);
            });
        }
    }

    // 事件监听
    generateBtn.addEventListener('click', doGenerate);
    copyBtn.addEventListener('click', copyResult);

    // 默认生成
    doGenerate();

    // 导出到全局
    window.LoremIpsumTool = { generate };
})();
