/**
 * Utils Unit Tests
 * 工具函数单元测试
 */

describe('REOT.utils', () => {
    describe('formatBytes', () => {
        test('0 字节', () => {
            expect(REOT.utils.formatBytes(0)).toBe('0 Bytes');
        });

        test('字节', () => {
            expect(REOT.utils.formatBytes(500)).toBe('500 Bytes');
        });

        test('KB', () => {
            expect(REOT.utils.formatBytes(1024)).toBe('1 KB');
        });

        test('MB', () => {
            expect(REOT.utils.formatBytes(1048576)).toBe('1 MB');
        });

        test('GB', () => {
            expect(REOT.utils.formatBytes(1073741824)).toBe('1 GB');
        });

        test('自定义小数位', () => {
            expect(REOT.utils.formatBytes(1234567, 2)).toBe('1.18 MB');
        });
    });

    describe('generateId', () => {
        test('生成唯一 ID', () => {
            const id1 = REOT.utils.generateId();
            const id2 = REOT.utils.generateId();
            expect(id1).not.toBe(id2);
        });

        test('使用前缀', () => {
            const id = REOT.utils.generateId('test');
            expect(id.startsWith('test_')).toBe(true);
        });
    });

    describe('isValidHex', () => {
        test('有效十六进制', () => {
            expect(REOT.utils.isValidHex('0123456789abcdefABCDEF')).toBe(true);
        });

        test('无效十六进制', () => {
            expect(REOT.utils.isValidHex('xyz')).toBe(false);
        });

        test('空字符串', () => {
            expect(REOT.utils.isValidHex('')).toBe(false);
        });
    });

    describe('stringToHex / hexToString', () => {
        test('ASCII 往返转换', () => {
            const original = 'Hello';
            const hex = REOT.utils.stringToHex(original);
            const result = REOT.utils.hexToString(hex);
            expect(result).toBe(original);
        });

        test('十六进制输出', () => {
            expect(REOT.utils.stringToHex('A')).toBe('41');
        });
    });

    describe('escapeHtml / unescapeHtml', () => {
        test('转义 HTML', () => {
            const input = '<script>alert("xss")</script>';
            const escaped = REOT.utils.escapeHtml(input);
            expect(escaped).not.toContain('<');
            expect(escaped).not.toContain('>');
        });

        test('往返转换', () => {
            const original = '<div class="test">Hello & World</div>';
            const escaped = REOT.utils.escapeHtml(original);
            const unescaped = REOT.utils.unescapeHtml(escaped);
            expect(unescaped).toBe(original);
        });
    });

    describe('deepClone', () => {
        test('克隆对象', () => {
            const original = { a: 1, b: { c: 2 } };
            const cloned = REOT.utils.deepClone(original);

            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.b).not.toBe(original.b);
        });

        test('克隆数组', () => {
            const original = [1, [2, 3], { a: 4 }];
            const cloned = REOT.utils.deepClone(original);

            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
        });

        test('克隆日期', () => {
            const original = new Date();
            const cloned = REOT.utils.deepClone(original);

            expect(cloned.getTime()).toBe(original.getTime());
            expect(cloned).not.toBe(original);
        });

        test('克隆原始值', () => {
            expect(REOT.utils.deepClone(null)).toBe(null);
            expect(REOT.utils.deepClone(123)).toBe(123);
            expect(REOT.utils.deepClone('string')).toBe('string');
        });
    });

    describe('debounce', () => {
        jest.useFakeTimers();

        test('延迟执行', () => {
            const fn = jest.fn();
            const debounced = REOT.utils.debounce(fn, 100);

            debounced();
            expect(fn).not.toBeCalled();

            jest.advanceTimersByTime(100);
            expect(fn).toBeCalledTimes(1);
        });

        test('多次调用只执行一次', () => {
            const fn = jest.fn();
            const debounced = REOT.utils.debounce(fn, 100);

            debounced();
            debounced();
            debounced();

            jest.advanceTimersByTime(100);
            expect(fn).toBeCalledTimes(1);
        });
    });

    describe('throttle', () => {
        jest.useFakeTimers();

        test('限制执行频率', () => {
            const fn = jest.fn();
            const throttled = REOT.utils.throttle(fn, 100);

            throttled();
            throttled();
            throttled();

            expect(fn).toBeCalledTimes(1);

            jest.advanceTimersByTime(100);
            throttled();

            expect(fn).toBeCalledTimes(2);
        });
    });
});
