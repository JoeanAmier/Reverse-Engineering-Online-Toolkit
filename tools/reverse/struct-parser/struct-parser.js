/**
 * 结构体解析工具
 * @description C 结构体内存布局可视化
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    /**
     * 检查当前是否在结构体解析工具页面
     */
    function isStructParserActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/reverse/struct-parser');
    }

    /**
     * 获取类型信息
     */
    function getTypeInfo(typeName, arch, maxAlign) {
        // 基本类型大小和对齐（按架构）
        const types32 = {
            'char': { size: 1, align: 1 },
            'signed char': { size: 1, align: 1 },
            'unsigned char': { size: 1, align: 1 },
            'uint8_t': { size: 1, align: 1 },
            'int8_t': { size: 1, align: 1 },
            'BYTE': { size: 1, align: 1 },
            'BOOL': { size: 1, align: 1 },

            'short': { size: 2, align: 2 },
            'signed short': { size: 2, align: 2 },
            'unsigned short': { size: 2, align: 2 },
            'uint16_t': { size: 2, align: 2 },
            'int16_t': { size: 2, align: 2 },
            'WORD': { size: 2, align: 2 },
            'wchar_t': { size: 2, align: 2 },

            'int': { size: 4, align: 4 },
            'signed int': { size: 4, align: 4 },
            'unsigned int': { size: 4, align: 4 },
            'uint32_t': { size: 4, align: 4 },
            'int32_t': { size: 4, align: 4 },
            'DWORD': { size: 4, align: 4 },
            'long': { size: 4, align: 4 },
            'signed long': { size: 4, align: 4 },
            'unsigned long': { size: 4, align: 4 },
            'float': { size: 4, align: 4 },

            'long long': { size: 8, align: 8 },
            'signed long long': { size: 8, align: 8 },
            'unsigned long long': { size: 8, align: 8 },
            'uint64_t': { size: 8, align: 8 },
            'int64_t': { size: 8, align: 8 },
            'QWORD': { size: 8, align: 8 },
            'double': { size: 8, align: 8 },

            'void*': { size: 4, align: 4 },
            'pointer': { size: 4, align: 4 },
            'size_t': { size: 4, align: 4 },
            'ptrdiff_t': { size: 4, align: 4 },
            'intptr_t': { size: 4, align: 4 },
            'uintptr_t': { size: 4, align: 4 },
        };

        const types64 = {
            ...types32,
            'long': { size: 8, align: 8 },
            'signed long': { size: 8, align: 8 },
            'unsigned long': { size: 8, align: 8 },
            'void*': { size: 8, align: 8 },
            'pointer': { size: 8, align: 8 },
            'size_t': { size: 8, align: 8 },
            'ptrdiff_t': { size: 8, align: 8 },
            'intptr_t': { size: 8, align: 8 },
            'uintptr_t': { size: 8, align: 8 },
        };

        const types = arch === 64 ? types64 : types32;

        // 规范化类型名
        let normalizedType = typeName.trim().toLowerCase();

        // 处理指针
        if (normalizedType.includes('*')) {
            return {
                size: arch === 64 ? 8 : 4,
                align: Math.min(arch === 64 ? 8 : 4, maxAlign),
                isPointer: true
            };
        }

        // 查找类型
        for (const [key, value] of Object.entries(types)) {
            if (normalizedType === key.toLowerCase()) {
                return {
                    size: value.size,
                    align: Math.min(value.align, maxAlign),
                    isPointer: false
                };
            }
        }

        // 未知类型默认为 int
        return {
            size: 4,
            align: Math.min(4, maxAlign),
            isPointer: false,
            unknown: true
        };
    }

    /**
     * 解析结构体定义
     */
    function parseStruct(code) {
        const fields = [];

        // 移除注释
        code = code.replace(/\/\/.*$/gm, '');
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');

        // 提取结构体内容
        const structMatch = code.match(/struct\s+(\w+)?\s*\{([\s\S]*)\}/);
        if (!structMatch) {
            throw new Error('无效的结构体定义');
        }

        const structName = structMatch[1] || 'Anonymous';
        const body = structMatch[2];

        // 解析字段
        const lines = body.split(';').filter(line => line.trim());

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // 匹配类型和字段名（支持数组）
            // 例如: "int a", "char b[10]", "unsigned int c", "void* ptr"
            const fieldMatch = trimmed.match(/^(.+?)\s+(\w+)(?:\[(\d+)\])?$/);

            if (fieldMatch) {
                const type = fieldMatch[1].trim();
                const name = fieldMatch[2];
                const arraySize = fieldMatch[3] ? parseInt(fieldMatch[3]) : null;

                fields.push({
                    type,
                    name,
                    arraySize
                });
            }
        }

        return { name: structName, fields };
    }

    /**
     * 计算结构体布局
     */
    function calculateLayout(structDef, arch, maxAlign) {
        const layout = [];
        let currentOffset = 0;
        let maxFieldAlign = 1;
        let totalDataBytes = 0;
        let totalPaddingBytes = 0;

        for (const field of structDef.fields) {
            const typeInfo = getTypeInfo(field.type, arch, maxAlign);
            const elementSize = typeInfo.size;
            const elementAlign = typeInfo.align;
            const count = field.arraySize || 1;
            const totalSize = elementSize * count;

            // 更新最大对齐
            if (elementAlign > maxFieldAlign) {
                maxFieldAlign = elementAlign;
            }

            // 计算填充
            const padding = (elementAlign - (currentOffset % elementAlign)) % elementAlign;

            if (padding > 0) {
                layout.push({
                    type: 'padding',
                    offset: currentOffset,
                    size: padding
                });
                currentOffset += padding;
                totalPaddingBytes += padding;
            }

            // 添加字段
            layout.push({
                type: 'field',
                name: field.name,
                fieldType: field.type,
                offset: currentOffset,
                size: totalSize,
                elementSize,
                arraySize: field.arraySize,
                align: elementAlign,
                typeInfo
            });

            currentOffset += totalSize;
            totalDataBytes += totalSize;
        }

        // 结构体尾部填充（对齐到最大字段对齐）
        const structAlign = Math.min(maxFieldAlign, maxAlign);
        const tailPadding = (structAlign - (currentOffset % structAlign)) % structAlign;

        if (tailPadding > 0) {
            layout.push({
                type: 'padding',
                offset: currentOffset,
                size: tailPadding,
                isTailPadding: true
            });
            currentOffset += tailPadding;
            totalPaddingBytes += tailPadding;
        }

        return {
            name: structDef.name,
            layout,
            totalSize: currentOffset,
            totalDataBytes,
            totalPaddingBytes,
            structAlign
        };
    }

    /**
     * 渲染内存布局可视化
     */
    function renderLayout(result) {
        const container = document.getElementById('layout-container');
        if (!container) return;

        let html = '';
        let byteIndex = 0;

        // 类型颜色映射
        const typeColors = {
            'char': 'type-char',
            'short': 'type-short',
            'int': 'type-int',
            'long': 'type-long',
            'float': 'type-float',
            'double': 'type-double',
        };

        for (const item of result.layout) {
            if (item.type === 'padding') {
                for (let i = 0; i < item.size; i++) {
                    html += `<div class="layout-byte padding" title="填充字节 @ 0x${(byteIndex).toString(16).toUpperCase()}">${byteIndex.toString(16).toUpperCase().padStart(2, '0')}</div>`;
                    byteIndex++;
                }
            } else {
                // 确定颜色类
                let colorClass = 'data';
                if (item.typeInfo?.isPointer) {
                    colorClass = 'type-pointer';
                } else if (item.arraySize) {
                    colorClass = 'type-array';
                } else {
                    const baseType = item.fieldType.toLowerCase().replace(/unsigned\s+|signed\s+/g, '');
                    for (const [key, value] of Object.entries(typeColors)) {
                        if (baseType.includes(key)) {
                            colorClass = value;
                            break;
                        }
                    }
                }

                for (let i = 0; i < item.size; i++) {
                    const fieldInfo = `${item.name} (${item.fieldType})`;
                    html += `<div class="layout-byte ${colorClass}" data-field="${fieldInfo}" title="${fieldInfo} @ 0x${(byteIndex).toString(16).toUpperCase()}">${byteIndex.toString(16).toUpperCase().padStart(2, '0')}</div>`;
                    byteIndex++;
                }
            }
        }

        container.innerHTML = html;
    }

    /**
     * 渲染字段表格
     */
    function renderFieldsTable(result) {
        const tbody = document.getElementById('fields-tbody');
        if (!tbody) return;

        let html = '';

        for (const item of result.layout) {
            if (item.type === 'padding') {
                html += `
                    <tr>
                        <td class="field-offset">0x${item.offset.toString(16).toUpperCase().padStart(4, '0')}</td>
                        <td>-</td>
                        <td class="field-type">padding</td>
                        <td class="field-size">${item.size} 字节</td>
                        <td class="field-note padding">${item.isTailPadding ? '结构体尾部对齐' : '字段对齐填充'}</td>
                    </tr>
                `;
            } else {
                let note = '';
                if (item.arraySize) {
                    note = `数组 [${item.arraySize}]`;
                } else if (item.typeInfo?.isPointer) {
                    note = '指针';
                } else if (item.typeInfo?.unknown) {
                    note = '未知类型，使用默认大小';
                }

                html += `
                    <tr>
                        <td class="field-offset">0x${item.offset.toString(16).toUpperCase().padStart(4, '0')}</td>
                        <td>${item.name}</td>
                        <td class="field-type">${item.fieldType}</td>
                        <td class="field-size">${item.size} 字节</td>
                        <td class="field-note">${note}</td>
                    </tr>
                `;
            }
        }

        tbody.innerHTML = html;
    }

    /**
     * 更新摘要信息
     */
    function updateSummary(result) {
        document.getElementById('total-size').textContent = `${result.totalSize} 字节`;
        document.getElementById('actual-data').textContent = `${result.totalDataBytes} 字节`;
        document.getElementById('padding-bytes').textContent = `${result.totalPaddingBytes} 字节`;

        const efficiency = ((result.totalDataBytes / result.totalSize) * 100).toFixed(1);
        document.getElementById('efficiency').textContent = `${efficiency}%`;
    }

    /**
     * 执行解析
     */
    function parse() {
        const code = document.getElementById('struct-input')?.value?.trim();
        const arch = parseInt(document.getElementById('arch-select')?.value || '64');
        const maxAlign = parseInt(document.getElementById('align-select')?.value || '8');

        if (!code) {
            throw new Error('请输入结构体定义');
        }

        const structDef = parseStruct(code);

        if (structDef.fields.length === 0) {
            throw new Error('未找到有效的字段定义');
        }

        const result = calculateLayout(structDef, arch, maxAlign);

        // 显示结果
        document.getElementById('results-section').style.display = 'block';
        updateSummary(result);
        renderLayout(result);
        renderFieldsTable(result);

        return result;
    }

    /**
     * 加载示例
     */
    function loadExample() {
        const example = `struct Example {
    char a;
    int b;
    short c;
    double d;
    char e[3];
    void* ptr;
    unsigned long long flags;
};`;

        const input = document.getElementById('struct-input');
        if (input) {
            input.value = example;
        }
    }

    // 事件处理
    document.addEventListener('click', async (e) => {
        if (!isStructParserActive()) return;

        const target = e.target;

        // 解析按钮
        if (target.id === 'parse-btn' || target.closest('#parse-btn')) {
            try {
                parse();
                REOT.utils?.showNotification('解析完成', 'success');
            } catch (error) {
                REOT.utils?.showNotification(error.message, 'error');
            }
        }

        // 清除按钮
        if (target.id === 'clear-btn' || target.closest('#clear-btn')) {
            const input = document.getElementById('struct-input');
            const resultsSection = document.getElementById('results-section');
            if (input) input.value = '';
            if (resultsSection) resultsSection.style.display = 'none';
        }

        // 加载示例按钮
        if (target.id === 'example-btn' || target.closest('#example-btn')) {
            loadExample();
        }
    });

    // 导出工具函数
    window.StructParser = {
        parseStruct,
        calculateLayout,
        getTypeInfo
    };

})();
