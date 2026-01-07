/**
 * REOT - Header Component
 * 页头组件
 */

(function() {
    'use strict';

    window.REOT = window.REOT || {};
    REOT.components = REOT.components || {};

    REOT.components.header = {
        /**
         * 初始化页头
         */
        init() {
            this.bindEvents();
        },

        /**
         * 绑定事件
         */
        bindEvents() {
            // 页面滚动时添加阴影效果
            let lastScrollY = 0;
            const header = document.getElementById('header');

            if (header) {
                window.addEventListener('scroll', () => {
                    const scrollY = window.scrollY;

                    if (scrollY > 10) {
                        header.classList.add('scrolled');
                    } else {
                        header.classList.remove('scrolled');
                    }

                    // 向下滚动隐藏，向上滚动显示
                    if (scrollY > lastScrollY && scrollY > 100) {
                        header.classList.add('hidden');
                    } else {
                        header.classList.remove('hidden');
                    }

                    lastScrollY = scrollY;
                });
            }
        }
    };

})();
