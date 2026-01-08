/**
 * 文件类型检测工具
 * @description 基于 Magic Number 检测文件真实类型
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * Magic Number 签名数据库
     * 格式: { magic: [字节数组], offset: 偏移量, type: 类型名, mime: MIME类型, ext: 扩展名, icon: 图标 }
     */
    const SIGNATURES = [
        // 图片格式
        { magic: [0xFF, 0xD8, 0xFF], type: 'JPEG Image', mime: 'image/jpeg', ext: 'jpg', icon: '🖼️' },
        { magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], type: 'PNG Image', mime: 'image/png', ext: 'png', icon: '🖼️' },
        { magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], type: 'GIF Image (87a)', mime: 'image/gif', ext: 'gif', icon: '🖼️' },
        { magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], type: 'GIF Image (89a)', mime: 'image/gif', ext: 'gif', icon: '🖼️' },
        { magic: [0x42, 0x4D], type: 'BMP Image', mime: 'image/bmp', ext: 'bmp', icon: '🖼️' },
        { magic: [0x00, 0x00, 0x01, 0x00], type: 'ICO Icon', mime: 'image/x-icon', ext: 'ico', icon: '🖼️' },
        { magic: [0x49, 0x49, 0x2A, 0x00], type: 'TIFF Image (LE)', mime: 'image/tiff', ext: 'tiff', icon: '🖼️' },
        { magic: [0x4D, 0x4D, 0x00, 0x2A], type: 'TIFF Image (BE)', mime: 'image/tiff', ext: 'tiff', icon: '🖼️' },
        { magic: [0x52, 0x49, 0x46, 0x46], type: 'WebP Image', mime: 'image/webp', ext: 'webp', icon: '🖼️', check: (bytes) => bytes.slice(8, 12).join(',') === [0x57, 0x45, 0x42, 0x50].join(',') },

        // 音频格式
        { magic: [0x49, 0x44, 0x33], type: 'MP3 Audio (ID3)', mime: 'audio/mpeg', ext: 'mp3', icon: '🎵' },
        { magic: [0xFF, 0xFB], type: 'MP3 Audio', mime: 'audio/mpeg', ext: 'mp3', icon: '🎵' },
        { magic: [0xFF, 0xFA], type: 'MP3 Audio', mime: 'audio/mpeg', ext: 'mp3', icon: '🎵' },
        { magic: [0x4F, 0x67, 0x67, 0x53], type: 'OGG Audio', mime: 'audio/ogg', ext: 'ogg', icon: '🎵' },
        { magic: [0x66, 0x4C, 0x61, 0x43], type: 'FLAC Audio', mime: 'audio/flac', ext: 'flac', icon: '🎵' },
        { magic: [0x52, 0x49, 0x46, 0x46], type: 'WAV Audio', mime: 'audio/wav', ext: 'wav', icon: '🎵', check: (bytes) => bytes.slice(8, 12).join(',') === [0x57, 0x41, 0x56, 0x45].join(',') },

        // 视频格式
        { magic: [0x00, 0x00, 0x00], type: 'MP4 Video', mime: 'video/mp4', ext: 'mp4', icon: '🎬', check: (bytes) => {
            const ftypes = ['ftyp', 'moov', 'mdat'];
            const str = String.fromCharCode(...bytes.slice(4, 8));
            return ftypes.some(f => str.includes(f));
        }},
        { magic: [0x1A, 0x45, 0xDF, 0xA3], type: 'MKV/WebM Video', mime: 'video/x-matroska', ext: 'mkv', icon: '🎬' },
        { magic: [0x52, 0x49, 0x46, 0x46], type: 'AVI Video', mime: 'video/x-msvideo', ext: 'avi', icon: '🎬', check: (bytes) => bytes.slice(8, 12).join(',') === [0x41, 0x56, 0x49, 0x20].join(',') },
        { magic: [0x46, 0x4C, 0x56, 0x01], type: 'FLV Video', mime: 'video/x-flv', ext: 'flv', icon: '🎬' },

        // 压缩格式
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'ZIP Archive', mime: 'application/zip', ext: 'zip', icon: '📦' },
        { magic: [0x50, 0x4B, 0x05, 0x06], type: 'ZIP Archive (Empty)', mime: 'application/zip', ext: 'zip', icon: '📦' },
        { magic: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07], type: 'RAR Archive', mime: 'application/x-rar-compressed', ext: 'rar', icon: '📦' },
        { magic: [0x1F, 0x8B, 0x08], type: 'GZIP Archive', mime: 'application/gzip', ext: 'gz', icon: '📦' },
        { magic: [0x42, 0x5A, 0x68], type: 'BZIP2 Archive', mime: 'application/x-bzip2', ext: 'bz2', icon: '📦' },
        { magic: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], type: '7-Zip Archive', mime: 'application/x-7z-compressed', ext: '7z', icon: '📦' },
        { magic: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00], type: 'XZ Archive', mime: 'application/x-xz', ext: 'xz', icon: '📦' },
        { magic: [0x75, 0x73, 0x74, 0x61, 0x72], type: 'TAR Archive', mime: 'application/x-tar', ext: 'tar', icon: '📦', offset: 257 },

        // 文档格式
        { magic: [0x25, 0x50, 0x44, 0x46], type: 'PDF Document', mime: 'application/pdf', ext: 'pdf', icon: '📕' },
        { magic: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], type: 'MS Office (OLE)', mime: 'application/msword', ext: 'doc', icon: '📄' },
        { magic: [0x50, 0x4B, 0x03, 0x04], type: 'Office Open XML', mime: 'application/vnd.openxmlformats-officedocument', ext: 'docx', icon: '📄', check: (bytes, file) => {
            const name = file?.name?.toLowerCase() || '';
            return name.endsWith('.docx') || name.endsWith('.xlsx') || name.endsWith('.pptx');
        }},

        // 可执行文件
        { magic: [0x4D, 0x5A], type: 'Windows Executable', mime: 'application/x-msdownload', ext: 'exe', icon: '⚙️' },
        { magic: [0x7F, 0x45, 0x4C, 0x46], type: 'ELF Executable', mime: 'application/x-executable', ext: 'elf', icon: '⚙️' },
        { magic: [0xCA, 0xFE, 0xBA, 0xBE], type: 'Java Class', mime: 'application/java-vm', ext: 'class', icon: '☕' },
        { magic: [0xCF, 0xFA, 0xED, 0xFE], type: 'Mach-O (32-bit)', mime: 'application/x-mach-binary', ext: '', icon: '🍎' },
        { magic: [0xCE, 0xFA, 0xED, 0xFE], type: 'Mach-O (32-bit, BE)', mime: 'application/x-mach-binary', ext: '', icon: '🍎' },
        { magic: [0xFE, 0xED, 0xFA, 0xCF], type: 'Mach-O (64-bit)', mime: 'application/x-mach-binary', ext: '', icon: '🍎' },
        { magic: [0xFE, 0xED, 0xFA, 0xCE], type: 'Mach-O (64-bit, BE)', mime: 'application/x-mach-binary', ext: '', icon: '🍎' },

        // 数据库
        { magic: [0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33, 0x00], type: 'SQLite Database', mime: 'application/x-sqlite3', ext: 'sqlite', icon: '🗄️' },

        // 字体
        { magic: [0x00, 0x01, 0x00, 0x00], type: 'TrueType Font', mime: 'font/ttf', ext: 'ttf', icon: '🔤' },
        { magic: [0x4F, 0x54, 0x54, 0x4F], type: 'OpenType Font', mime: 'font/otf', ext: 'otf', icon: '🔤' },
        { magic: [0x77, 0x4F, 0x46, 0x46], type: 'WOFF Font', mime: 'font/woff', ext: 'woff', icon: '🔤' },
        { magic: [0x77, 0x4F, 0x46, 0x32], type: 'WOFF2 Font', mime: 'font/woff2', ext: 'woff2', icon: '🔤' },

        // 其他
        { magic: [0x3C, 0x3F, 0x78, 0x6D, 0x6C], type: 'XML Document', mime: 'application/xml', ext: 'xml', icon: '📝' },
        { magic: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74, 0x6D, 0x6C], type: 'HTML Document', mime: 'text/html', ext: 'html', icon: '🌐' },
        { magic: [0x3C, 0x68, 0x74, 0x6D, 0x6C], type: 'HTML Document', mime: 'text/html', ext: 'html', icon: '🌐' },
    ];

    /**
     * 检查当前是否在文件类型工具页面
     */
    function isFileTypeToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/binary/file-type');
    }

    /**
     * 格式化文件大小
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 字节数组转 Hex 字符串
     */
    function bytesToHex(bytes, separator = ' ') {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(separator);
    }

    /**
     * 字节数组转可打印 ASCII
     */
    function bytesToAscii(bytes) {
        return Array.from(bytes)
            .map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
            .join('');
    }

    /**
     * 检测文件类型
     * @param {Uint8Array} bytes - 文件字节
     * @param {File} file - 文件对象
     * @returns {Object} - 检测结果
     */
    function detectFileType(bytes, file) {
        for (const sig of SIGNATURES) {
            const offset = sig.offset || 0;

            // 检查是否有足够的字节
            if (bytes.length < offset + sig.magic.length) {
                continue;
            }

            // 比较 magic number
            const slice = bytes.slice(offset, offset + sig.magic.length);
            const match = sig.magic.every((byte, i) => slice[i] === byte);

            if (match) {
                // 如果有额外检查函数，执行它
                if (sig.check && !sig.check(bytes, file)) {
                    continue;
                }

                return {
                    type: sig.type,
                    mime: sig.mime,
                    ext: sig.ext,
                    icon: sig.icon,
                    matched: true
                };
            }
        }

        // 未识别
        return {
            type: 'Unknown',
            mime: 'application/octet-stream',
            ext: '',
            icon: '❓',
            matched: false
        };
    }

    /**
     * 显示检测结果
     */
    function displayResult(result, file, bytes) {
        const resultSection = document.getElementById('result-section');
        const resultIcon = document.getElementById('result-icon');
        const resultType = document.getElementById('result-type');
        const resultMime = document.getElementById('result-mime');
        const detailFilename = document.getElementById('detail-filename');
        const detailSize = document.getElementById('detail-size');
        const detailExtension = document.getElementById('detail-extension');
        const detailSuggested = document.getElementById('detail-suggested');
        const magicHex = document.getElementById('magic-hex');
        const magicAscii = document.getElementById('magic-ascii');
        const warningBox = document.getElementById('warning-box');
        const warningText = document.getElementById('warning-text');

        if (resultSection) resultSection.style.display = 'block';
        if (resultIcon) resultIcon.textContent = result.icon;
        if (resultType) resultType.textContent = result.type;
        if (resultMime) resultMime.textContent = result.mime;
        if (detailFilename) detailFilename.textContent = file.name;
        if (detailSize) detailSize.textContent = formatFileSize(file.size);

        // 获取文件扩展名
        const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
        if (detailExtension) detailExtension.textContent = ext || '-';
        if (detailSuggested) detailSuggested.textContent = result.ext || '-';

        // 显示 Magic Number (前 16 字节)
        const magicBytes = bytes.slice(0, Math.min(16, bytes.length));
        if (magicHex) magicHex.textContent = bytesToHex(magicBytes);
        if (magicAscii) magicAscii.textContent = bytesToAscii(magicBytes);

        // 检查扩展名是否匹配
        if (warningBox && warningText) {
            if (result.matched && result.ext && ext && ext !== result.ext) {
                warningBox.style.display = 'flex';
                warningText.textContent = `文件扩展名 (.${ext}) 与检测到的真实类型 (.${result.ext}) 不匹配！这可能是文件被重命名或伪装。`;
            } else if (!result.matched) {
                warningBox.style.display = 'flex';
                warningText.textContent = '无法识别此文件类型。文件可能是纯文本、损坏的二进制文件或不在支持列表中的格式。';
            } else {
                warningBox.style.display = 'none';
            }
        }
    }

    /**
     * 显示支持的文件类型
     */
    function displaySupportedTypes() {
        const container = document.getElementById('type-tags');
        if (!container) return;

        const types = [...new Set(SIGNATURES.map(s => s.ext).filter(Boolean))];
        container.innerHTML = types
            .sort()
            .map(ext => `<span class="type-tag">.${ext}</span>`)
            .join('');
    }

    /**
     * 清除结果
     */
    function clearResult() {
        const resultSection = document.getElementById('result-section');
        const fileInput = document.getElementById('file-input');

        if (resultSection) resultSection.style.display = 'none';
        if (fileInput) fileInput.value = '';
    }

    // 文件上传处理
    document.addEventListener('change', (e) => {
        if (!isFileTypeToolActive()) return;

        if (e.target.id === 'file-input') {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const bytes = new Uint8Array(event.target.result);
                const result = detectFileType(bytes, file);
                displayResult(result, file, bytes);
            };
            // 只读取前 1KB，足够识别大多数文件类型
            reader.readAsArrayBuffer(file.slice(0, 1024));
        }
    });

    // 拖拽处理
    document.addEventListener('dragover', (e) => {
        if (!isFileTypeToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        }
    });

    document.addEventListener('dragleave', (e) => {
        if (!isFileTypeToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            uploadArea.classList.remove('drag-over');
        }
    });

    document.addEventListener('drop', (e) => {
        if (!isFileTypeToolActive()) return;

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea && uploadArea.contains(e.target)) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const bytes = new Uint8Array(event.target.result);
                    const result = detectFileType(bytes, file);
                    displayResult(result, file, bytes);
                };
                reader.readAsArrayBuffer(file.slice(0, 1024));
            }
        }
    });

    // 点击事件
    document.addEventListener('click', (e) => {
        if (!isFileTypeToolActive()) return;

        const target = e.target;

        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            clearResult();
        }
    });

    // 初始化
    displaySupportedTypes();

    // 导出工具函数
    window.FileTypeTool = { detectFileType, SIGNATURES };

})();
