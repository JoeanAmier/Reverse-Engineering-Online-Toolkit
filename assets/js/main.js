/**
 * REOT - Main Application
 * 主程序入口
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // 全局命名空间
    window.REOT = window.REOT || {};

    /**
     * 主应用模块
     */
    REOT.app = {
        // 应用版本
        version: '1.0.0',

        // 是否已初始化
        initialized: false,

        /**
         * 初始化应用
         */
        async init() {
            if (this.initialized) {
                return;
            }

            console.log('%c REOT %c v' + this.version + ' ',
                'background: #3b82f6; color: white; padding: 2px 4px; border-radius: 3px 0 0 3px;',
                'background: #1e293b; color: white; padding: 2px 4px; border-radius: 0 3px 3px 0;'
            );

            try {
                // 初始化国际化
                await REOT.i18n.init();

                // 初始化路由
                REOT.router.init();

                // 检查是否有重定向路径参数（从工具页面刷新后重定向过来）
                const urlParams = new URLSearchParams(window.location.search);
                const redirectPath = urlParams.get('path');
                if (redirectPath) {
                    // 清除 URL 参数
                    window.history.replaceState({}, '', redirectPath);
                    // 导航到目标路径
                    REOT.router.handleRouteChange(redirectPath);
                }

                // 初始化工具侧边栏
                REOT.tools.initSidebar();

                // 初始化首页工具网格
                REOT.tools.initHomeGrid();

                // 初始化搜索
                REOT.tools.initSearch();

                // 初始化主题切换
                this.initTheme();

                // 初始化移动端菜单
                this.initMobileMenu();

                // 监听语言变更
                window.addEventListener('localechange', () => {
                    REOT.tools.initSidebar();
                    REOT.tools.initHomeGrid();
                });

                this.initialized = true;
                console.log('REOT 初始化完成');

            } catch (error) {
                console.error('REOT 初始化失败:', error);
            }
        },

        /**
         * 初始化主题
         */
        initTheme() {
            // 从存储获取主题设置
            let currentTheme = REOT.utils.storage.get('theme', null);

            // 检查系统主题偏好
            if (!currentTheme) {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    currentTheme = 'dark';
                } else {
                    currentTheme = 'light';
                }
            }

            // 应用主题的函数（存储到REOT以便全局访问）
            REOT.applyTheme = (theme) => {
                const themeToggle = document.getElementById('theme-toggle');

                if (theme === 'dark') {
                    // 添加主题类到 html 和 body（CSS 使用类选择器切换主题）
                    document.documentElement.classList.add('dark-theme');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.body.classList.add('dark-theme');
                    // 切换图标
                    if (themeToggle) {
                        const sunIcon = themeToggle.querySelector('.icon-sun');
                        const moonIcon = themeToggle.querySelector('.icon-moon');
                        if (sunIcon) sunIcon.style.display = 'none';
                        if (moonIcon) moonIcon.style.display = 'block';
                    }
                } else {
                    // 移除主题类
                    document.documentElement.classList.remove('dark-theme');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.body.classList.remove('dark-theme');
                    // 切换图标
                    if (themeToggle) {
                        const sunIcon = themeToggle.querySelector('.icon-sun');
                        const moonIcon = themeToggle.querySelector('.icon-moon');
                        if (sunIcon) sunIcon.style.display = 'block';
                        if (moonIcon) moonIcon.style.display = 'none';
                    }
                }
                // 保存到存储
                REOT.utils.storage.set('theme', theme);
                // 当前主题
                REOT.currentTheme = theme;
            };

            // 初始应用主题
            REOT.applyTheme(currentTheme);

            // 主题切换按钮事件
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    const newTheme = REOT.currentTheme === 'dark' ? 'light' : 'dark';
                    REOT.applyTheme(newTheme);
                });
            }

            // 监听系统主题变化
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    // 只有在用户没有手动设置主题时才响应系统变化
                    const savedTheme = REOT.utils.storage.get('theme', null);
                    if (!savedTheme) {
                        REOT.applyTheme(e.matches ? 'dark' : 'light');
                    }
                });
            }
        },

        /**
         * 初始化移动端菜单
         */
        initMobileMenu() {
            const menuToggle = document.getElementById('menu-toggle');
            const sidebar = document.getElementById('sidebar');

            if (!menuToggle || !sidebar) {
                return;
            }

            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                menuToggle.classList.toggle('active');
            });

            // 点击主内容区关闭菜单
            document.getElementById('main')?.addEventListener('click', () => {
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    menuToggle.classList.remove('active');
                }
            });

            // 路由变化时关闭菜单
            REOT.router.onChange(() => {
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    menuToggle.classList.remove('active');
                }
            });
        }
    };

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => REOT.app.init());
    } else {
        REOT.app.init();
    }

})();
