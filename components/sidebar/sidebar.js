/**
 * REOT - Sidebar Component
 * 侧边栏组件
 */

(function() {
    'use strict';

    window.REOT = window.REOT || {};
    REOT.components = REOT.components || {};

    REOT.components.sidebar = {
        /**
         * 初始化侧边栏
         */
        init() {
            this.bindEvents();
            this.restoreState();
        },

        /**
         * 绑定事件
         */
        bindEvents() {
            // 分类折叠/展开
            document.querySelectorAll('.category-header').forEach(header => {
                header.addEventListener('click', (e) => {
                    const category = header.closest('.nav-category');
                    this.toggleCategory(category);
                });
            });
        },

        /**
         * 切换分类展开/折叠状态
         * @param {HTMLElement} category - 分类元素
         */
        toggleCategory(category) {
            category.classList.toggle('collapsed');
            this.saveState();
        },

        /**
         * 保存折叠状态
         */
        saveState() {
            const collapsedCategories = [];
            document.querySelectorAll('.nav-category.collapsed').forEach(cat => {
                collapsedCategories.push(cat.dataset.category);
            });
            REOT.utils.storage.set('sidebar-collapsed', collapsedCategories);
        },

        /**
         * 恢复折叠状态
         */
        restoreState() {
            const collapsedCategories = REOT.utils.storage.get('sidebar-collapsed', []);
            collapsedCategories.forEach(categoryId => {
                const category = document.querySelector(`.nav-category[data-category="${categoryId}"]`);
                if (category) {
                    category.classList.add('collapsed');
                }
            });
        },

        /**
         * 展开所有分类
         */
        expandAll() {
            document.querySelectorAll('.nav-category').forEach(cat => {
                cat.classList.remove('collapsed');
            });
            this.saveState();
        },

        /**
         * 折叠所有分类
         */
        collapseAll() {
            document.querySelectorAll('.nav-category').forEach(cat => {
                cat.classList.add('collapsed');
            });
            this.saveState();
        }
    };

})();
