/**
 * MD5 Tool Unit Tests
 * MD5 工具单元测试
 */

describe('MD5Tool', () => {
    describe('哈希计算', () => {
        test('空字符串', () => {
            const expected = 'd41d8cd98f00b204e9800998ecf8427e';
            expect(MD5Tool.hash('')).toBe(expected);
        });

        test('ASCII 字符串', () => {
            const input = 'hello';
            const expected = '5d41402abc4b2a76b9719d911017c592';
            expect(MD5Tool.hash(input)).toBe(expected);
        });

        test('Hello World', () => {
            const input = 'Hello World';
            const expected = 'b10a8db164e0754105b7a99be72e3fe5';
            expect(MD5Tool.hash(input)).toBe(expected);
        });

        test('中文字符串', () => {
            const input = '你好';
            const expected = '7eca689f0d3389d9dea66ae112e5cfd7';
            expect(MD5Tool.hash(input)).toBe(expected);
        });

        test('数字字符串', () => {
            const input = '123456';
            const expected = 'e10adc3949ba59abbe56e057f20f883e';
            expect(MD5Tool.hash(input)).toBe(expected);
        });

        test('长字符串', () => {
            const input = 'a'.repeat(1000);
            const result = MD5Tool.hash(input);
            expect(result).toHaveLength(32);
            expect(result).toMatch(/^[0-9a-f]{32}$/);
        });

        test('特殊字符', () => {
            const input = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            const result = MD5Tool.hash(input);
            expect(result).toHaveLength(32);
        });

        test('换行符', () => {
            const input = 'hello\nworld';
            const result = MD5Tool.hash(input);
            expect(result).toHaveLength(32);
        });
    });

    describe('一致性', () => {
        test('相同输入产生相同输出', () => {
            const input = 'test string';
            const hash1 = MD5Tool.hash(input);
            const hash2 = MD5Tool.hash(input);
            expect(hash1).toBe(hash2);
        });

        test('不同输入产生不同输出', () => {
            const hash1 = MD5Tool.hash('input1');
            const hash2 = MD5Tool.hash('input2');
            expect(hash1).not.toBe(hash2);
        });
    });
});
