/**
 * REOT - File Uploader Component
 * 文件上传组件
 */

(function() {
    'use strict';

    window.REOT = window.REOT || {};
    REOT.components = REOT.components || {};

    REOT.components.fileUploader = {
        /**
         * 创建文件上传器
         * @param {Object} options - 配置选项
         * @returns {HTMLElement} - 上传器元素
         */
        create(options = {}) {
            const {
                accept = '*/*',
                multiple = false,
                maxSize = 10 * 1024 * 1024, // 10MB
                onFile,
                onError
            } = options;

            const container = document.createElement('div');
            container.className = 'form-file';
            container.innerHTML = `
                <div class="form-file__dropzone">
                    <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''}>
                    <div class="form-file__icon">📁</div>
                    <div class="form-file__text">
                        <span data-i18n="common.dragOrClick">拖拽文件到这里或</span>
                        <strong data-i18n="common.clickUpload">点击上传</strong>
                    </div>
                </div>
            `;

            const dropzone = container.querySelector('.form-file__dropzone');
            const input = container.querySelector('input[type="file"]');

            // 点击上传
            dropzone.addEventListener('click', () => input.click());

            // 文件选择
            input.addEventListener('change', (e) => {
                this.handleFiles(e.target.files, { maxSize, onFile, onError });
            });

            // 拖拽上传
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('form-file__dropzone--active');
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('form-file__dropzone--active');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('form-file__dropzone--active');
                this.handleFiles(e.dataTransfer.files, { maxSize, onFile, onError });
            });

            return container;
        },

        /**
         * 处理文件
         * @param {FileList} files - 文件列表
         * @param {Object} options - 选项
         */
        async handleFiles(files, options) {
            const { maxSize, onFile, onError } = options;

            for (const file of files) {
                // 检查文件大小
                if (file.size > maxSize) {
                    const error = new Error(`文件 "${file.name}" 超过最大限制 (${REOT.utils.formatBytes(maxSize)})`);
                    if (onError) {
                        onError(error, file);
                    }
                    continue;
                }

                try {
                    if (onFile) {
                        await onFile(file);
                    }
                } catch (error) {
                    if (onError) {
                        onError(error, file);
                    }
                }
            }
        },

        /**
         * 读取文件为文本
         * @param {File} file - 文件对象
         * @returns {Promise<string>}
         */
        readAsText(file) {
            return REOT.utils.readFile(file, 'text');
        },

        /**
         * 读取文件为 ArrayBuffer
         * @param {File} file - 文件对象
         * @returns {Promise<ArrayBuffer>}
         */
        readAsArrayBuffer(file) {
            return REOT.utils.readFile(file, 'arrayBuffer');
        },

        /**
         * 读取文件为 Data URL
         * @param {File} file - 文件对象
         * @returns {Promise<string>}
         */
        readAsDataURL(file) {
            return REOT.utils.readFile(file, 'dataURL');
        }
    };

})();
