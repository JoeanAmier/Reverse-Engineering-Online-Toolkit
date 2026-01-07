/**
 * Jest Setup File
 * Jest 测试设置文件
 */

// 模拟 localStorage
const localStorageMock = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = value;
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// 模拟 clipboard API
Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue('')
    }
});

// 模拟 crypto.randomUUID
if (!crypto.randomUUID) {
    crypto.randomUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

// 全局 REOT 对象
global.REOT = {
    utils: {},
    i18n: {},
    router: {},
    tools: {}
};

// 加载工具函数（简化版本用于测试）
require('../assets/js/utils.js');
