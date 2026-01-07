/**
 * Base64 Tool Unit Tests
 * Base64 工具单元测试
 */

// 模拟 DOM 环境
const mockDOM = () => {
    document.body.innerHTML = `
        <textarea id="input"></textarea>
        <textarea id="output"></textarea>
        <input type="radio" name="base64-type" value="standard" checked>
        <input type="radio" name="base64-type" value="urlsafe">
        <button id="encode-btn"></button>
        <button id="decode-btn"></button>
        <button id="clear-btn"></button>
        <button id="copy-btn"></button>
    `;
};

// 测试前设置
beforeEach(() => {
    mockDOM();
    // 加载工具脚本后，Base64Tool 应该可用
});

describe('Base64Tool', () => {
    describe('标准 Base64', () => {
        test('编码 ASCII 字符串', () => {
            const input = 'Hello World';
            const expected = 'SGVsbG8gV29ybGQ=';
            expect(Base64Tool.encodeStandard(input)).toBe(expected);
        });

        test('解码 ASCII 字符串', () => {
            const input = 'SGVsbG8gV29ybGQ=';
            const expected = 'Hello World';
            expect(Base64Tool.decodeStandard(input)).toBe(expected);
        });

        test('编码中文字符串', () => {
            const input = '你好世界';
            const expected = '5L2g5aW95LiW55WM';
            expect(Base64Tool.encodeStandard(input)).toBe(expected);
        });

        test('解码中文字符串', () => {
            const input = '5L2g5aW95LiW55WM';
            const expected = '你好世界';
            expect(Base64Tool.decodeStandard(input)).toBe(expected);
        });

        test('编码空字符串', () => {
            expect(Base64Tool.encode('')).toBe('');
        });

        test('编码 emoji', () => {
            const input = '😀🎉';
            const encoded = Base64Tool.encodeStandard(input);
            const decoded = Base64Tool.decodeStandard(encoded);
            expect(decoded).toBe(input);
        });
    });

    describe('URL 安全 Base64', () => {
        test('编码（无填充）', () => {
            const input = 'Hello World';
            const encoded = Base64Tool.encodeUrlSafe(input);
            expect(encoded).not.toContain('+');
            expect(encoded).not.toContain('/');
            expect(encoded).not.toContain('=');
        });

        test('解码（无填充）', () => {
            const input = 'SGVsbG8gV29ybGQ';
            const expected = 'Hello World';
            expect(Base64Tool.decodeUrlSafe(input)).toBe(expected);
        });

        test('URL 安全字符替换', () => {
            // 包含 + 和 / 的标准 Base64
            const input = '>>>???'; // 会产生 + 和 /
            const urlSafe = Base64Tool.encodeUrlSafe(input);
            expect(urlSafe).not.toContain('+');
            expect(urlSafe).not.toContain('/');
        });

        test('往返转换', () => {
            const original = 'Test data with special chars: <>?';
            const encoded = Base64Tool.encodeUrlSafe(original);
            const decoded = Base64Tool.decodeUrlSafe(encoded);
            expect(decoded).toBe(original);
        });
    });

    describe('错误处理', () => {
        test('解码无效 Base64 抛出错误', () => {
            expect(() => {
                Base64Tool.decodeStandard('invalid!!!');
            }).toThrow();
        });
    });
});
