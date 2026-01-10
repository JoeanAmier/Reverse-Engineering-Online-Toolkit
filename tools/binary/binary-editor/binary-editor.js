/**
 * Binary Editor Tool
 * @description Binary file viewer and editor with full editing capabilities
 * @author Evil0ctal
 * @license Apache-2.0
 */

(function() {
    'use strict';

    // Editor State
    let fileData = null;           // Current file data (Uint8Array)
    let originalData = null;       // Original data for comparison
    let fileName = 'untitled.bin'; // Current file name
    let isModified = false;        // Has file been modified
    let cursorOffset = 0;          // Current cursor position
    let selectionStart = -1;       // Selection start offset
    let selectionEnd = -1;         // Selection end offset
    let undoStack = [];            // Undo history
    let redoStack = [];            // Redo history
    let searchResults = [];        // Search match positions
    let currentSearchIndex = -1;   // Current search result index
    let displayLimit = 50000;      // Max bytes to display at once
    let displayOffset = 0;         // Current display offset

    // ========== Utility Functions ==========

    function byteToHex(byte, uppercase) {
        const hex = byte.toString(16).padStart(2, '0');
        return uppercase ? hex.toUpperCase() : hex;
    }

    function hexToByte(hex) {
        return parseInt(hex, 16);
    }

    function byteToAscii(byte) {
        if (byte >= 32 && byte <= 126) {
            return String.fromCharCode(byte);
        }
        return '.';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatOffset(offset, uppercase) {
        const hex = offset.toString(16).padStart(8, '0');
        return '0x' + (uppercase ? hex.toUpperCase() : hex);
    }

    function parseOffset(str) {
        str = str.trim().toLowerCase();
        if (str.startsWith('0x')) {
            return parseInt(str.slice(2), 16);
        }
        return parseInt(str, 10);
    }

    function getOptions() {
        return {
            bytesPerLine: parseInt(document.getElementById('bytes-per-line')?.value || '16', 10),
            showAscii: document.getElementById('show-ascii')?.checked ?? true,
            uppercase: document.getElementById('uppercase')?.checked ?? true
        };
    }

    // ========== Editor State Management ==========

    function setModified(modified) {
        isModified = modified;
        const indicator = document.getElementById('modified-indicator');
        if (indicator) {
            indicator.style.display = modified ? 'inline' : 'none';
        }
    }

    function pushUndo(action) {
        undoStack.push(action);
        if (undoStack.length > 100) {
            undoStack.shift();
        }
        redoStack = [];
        updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        if (undoBtn) undoBtn.disabled = undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    }

    function undo() {
        if (undoStack.length === 0) return;

        const action = undoStack.pop();
        redoStack.push(action);

        if (action.type === 'modify') {
            fileData[action.offset] = action.oldValue;
        } else if (action.type === 'insert') {
            const newData = new Uint8Array(fileData.length - 1);
            newData.set(fileData.subarray(0, action.offset));
            newData.set(fileData.subarray(action.offset + 1), action.offset);
            fileData = newData;
        } else if (action.type === 'delete') {
            const newData = new Uint8Array(fileData.length + 1);
            newData.set(fileData.subarray(0, action.offset));
            newData[action.offset] = action.value;
            newData.set(fileData.subarray(action.offset), action.offset + 1);
            fileData = newData;
        } else if (action.type === 'fill') {
            for (let i = 0; i < action.oldValues.length; i++) {
                fileData[action.start + i] = action.oldValues[i];
            }
        }

        setModified(true);
        updateUndoRedoButtons();
        renderEditor();
    }

    function redo() {
        if (redoStack.length === 0) return;

        const action = redoStack.pop();
        undoStack.push(action);

        if (action.type === 'modify') {
            fileData[action.offset] = action.newValue;
        } else if (action.type === 'insert') {
            const newData = new Uint8Array(fileData.length + 1);
            newData.set(fileData.subarray(0, action.offset));
            newData[action.offset] = action.value;
            newData.set(fileData.subarray(action.offset), action.offset + 1);
            fileData = newData;
        } else if (action.type === 'delete') {
            const newData = new Uint8Array(fileData.length - 1);
            newData.set(fileData.subarray(0, action.offset));
            newData.set(fileData.subarray(action.offset + 1), action.offset);
            fileData = newData;
        } else if (action.type === 'fill') {
            for (let i = action.start; i <= action.end; i++) {
                fileData[i] = action.fillValue;
            }
        }

        setModified(true);
        updateUndoRedoButtons();
        renderEditor();
    }

    // ========== File Operations ==========

    function newFile() {
        fileData = new Uint8Array(16);
        originalData = new Uint8Array(16);
        fileName = 'untitled.bin';
        isModified = false;
        cursorOffset = 0;
        selectionStart = -1;
        selectionEnd = -1;
        undoStack = [];
        redoStack = [];
        displayOffset = 0;

        updateFileInfo();
        renderEditor();
        showStatusBar(true);
    }

    function loadFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fileData = new Uint8Array(e.target.result);
            originalData = new Uint8Array(e.target.result);
            fileName = file.name;
            isModified = false;
            cursorOffset = 0;
            selectionStart = -1;
            selectionEnd = -1;
            undoStack = [];
            redoStack = [];
            displayOffset = 0;

            updateFileInfo();
            renderEditor();
            showStatusBar(true);
            REOT.utils?.showNotification('File loaded successfully', 'success');
        };
        reader.readAsArrayBuffer(file);
    }

    function saveFile() {
        if (!fileData) return;

        const blob = new Blob([fileData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        originalData = new Uint8Array(fileData);
        setModified(false);
        REOT.utils?.showNotification('File saved', 'success');
    }

    function updateFileInfo() {
        const fileInfoEl = document.getElementById('file-info');
        const fileNameEl = document.getElementById('file-name');
        const fileSizeEl = document.getElementById('file-size');
        const totalSizeEl = document.getElementById('total-size');

        if (fileInfoEl) fileInfoEl.style.display = fileData ? 'flex' : 'none';
        if (fileNameEl) fileNameEl.textContent = fileName;
        if (fileSizeEl) fileSizeEl.textContent = formatFileSize(fileData?.length || 0);
        if (totalSizeEl) totalSizeEl.textContent = formatFileSize(fileData?.length || 0);

        setModified(isModified);
        updateUndoRedoButtons();
    }

    function showStatusBar(show) {
        const statusBar = document.getElementById('status-bar');
        if (statusBar) statusBar.style.display = show ? 'flex' : 'none';
    }

    // ========== Editor Rendering ==========

    function renderEditor() {
        const editor = document.getElementById('hex-editor');
        const emptyState = document.getElementById('empty-state');

        if (!fileData || fileData.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const options = getOptions();
        const { bytesPerLine, showAscii, uppercase } = options;

        // Calculate display range
        const endOffset = Math.min(displayOffset + displayLimit, fileData.length);

        let html = '<table class="hex-table">';
        html += '<thead><tr><th class="hex-offset">Offset</th>';
        html += '<th class="hex-bytes">Hex</th>';
        if (showAscii) {
            html += '<th class="hex-ascii">ASCII</th>';
        }
        html += '</tr></thead><tbody>';

        for (let offset = displayOffset; offset < endOffset; offset += bytesPerLine) {
            const offsetHex = offset.toString(16).padStart(8, '0');

            let hexBytes = '';
            let asciiChars = '';

            for (let i = 0; i < bytesPerLine; i++) {
                const byteIndex = offset + i;
                if (byteIndex < fileData.length) {
                    const byte = fileData[byteIndex];
                    const isModifiedByte = originalData && byteIndex < originalData.length && originalData[byteIndex] !== byte;
                    const isSelected = byteIndex >= selectionStart && byteIndex <= selectionEnd && selectionStart !== -1;
                    const isCursor = byteIndex === cursorOffset;
                    const isSearchMatch = searchResults.includes(byteIndex);

                    let byteClass = 'hex-byte';
                    if (isModifiedByte) byteClass += ' modified';
                    if (isSelected) byteClass += ' selected';
                    if (isCursor && selectionStart === -1) byteClass += ' editing';
                    if (isSearchMatch) byteClass += ' search-match';

                    let asciiClass = 'ascii-char';
                    if (isModifiedByte) asciiClass += ' modified';
                    if (isSelected) asciiClass += ' selected';
                    if (isSearchMatch) asciiClass += ' search-match';

                    hexBytes += `<span class="${byteClass}" data-offset="${byteIndex}">${byteToHex(byte, uppercase)}</span>`;
                    asciiChars += `<span class="${asciiClass}" data-offset="${byteIndex}">${escapeHtml(byteToAscii(byte))}</span>`;
                } else {
                    hexBytes += '<span class="hex-byte empty">  </span>';
                    asciiChars += '<span class="ascii-char empty"> </span>';
                }

                if (i === 7 && bytesPerLine > 8) {
                    hexBytes += '<span class="hex-separator"> </span>';
                }
            }

            html += `<tr>`;
            html += `<td class="hex-offset">${uppercase ? offsetHex.toUpperCase() : offsetHex}</td>`;
            html += `<td class="hex-bytes">${hexBytes}</td>`;
            if (showAscii) {
                html += `<td class="hex-ascii">${asciiChars}</td>`;
            }
            html += '</tr>';
        }

        html += '</tbody></table>';

        // Add load more indicator if needed
        if (endOffset < fileData.length) {
            html += `<div class="load-more-panel">
                <p>Showing ${endOffset.toLocaleString()} of ${fileData.length.toLocaleString()} bytes</p>
                <button id="load-more-btn" class="btn btn--sm btn--primary">Load More</button>
            </div>`;
        }

        editor.innerHTML = html;
        updateStatusBar();
    }

    function escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return str.replace(/[&<>"']/g, m => map[m]);
    }

    function updateStatusBar() {
        const options = getOptions();
        const cursorOffsetEl = document.getElementById('cursor-offset');
        const selectionInfoEl = document.getElementById('selection-info');
        const byteValueEl = document.getElementById('byte-value');

        if (cursorOffsetEl) {
            cursorOffsetEl.textContent = formatOffset(cursorOffset, options.uppercase);
        }

        if (selectionInfoEl) {
            if (selectionStart !== -1 && selectionEnd !== -1) {
                const count = selectionEnd - selectionStart + 1;
                selectionInfoEl.textContent = `${count} bytes (${formatOffset(selectionStart, options.uppercase)} - ${formatOffset(selectionEnd, options.uppercase)})`;
            } else {
                selectionInfoEl.textContent = '-';
            }
        }

        if (byteValueEl && fileData && cursorOffset < fileData.length) {
            const byte = fileData[cursorOffset];
            byteValueEl.textContent = `0x${byteToHex(byte, options.uppercase)} (${byte}) '${byteToAscii(byte)}'`;
        } else if (byteValueEl) {
            byteValueEl.textContent = '-';
        }
    }

    // ========== Editing Operations ==========

    function modifyByte(offset, newValue) {
        if (!fileData || offset < 0 || offset >= fileData.length) return;

        const oldValue = fileData[offset];
        if (oldValue === newValue) return;

        pushUndo({
            type: 'modify',
            offset: offset,
            oldValue: oldValue,
            newValue: newValue
        });

        fileData[offset] = newValue;
        setModified(true);
        renderEditor();
    }

    function insertByte(offset, value = 0) {
        if (!fileData) return;
        offset = Math.max(0, Math.min(offset, fileData.length));

        pushUndo({
            type: 'insert',
            offset: offset,
            value: value
        });

        const newData = new Uint8Array(fileData.length + 1);
        newData.set(fileData.subarray(0, offset));
        newData[offset] = value;
        newData.set(fileData.subarray(offset), offset + 1);
        fileData = newData;

        setModified(true);
        updateFileInfo();
        renderEditor();
    }

    function deleteByte(offset) {
        if (!fileData || fileData.length <= 1 || offset < 0 || offset >= fileData.length) return;

        pushUndo({
            type: 'delete',
            offset: offset,
            value: fileData[offset]
        });

        const newData = new Uint8Array(fileData.length - 1);
        newData.set(fileData.subarray(0, offset));
        newData.set(fileData.subarray(offset + 1), offset);
        fileData = newData;

        if (cursorOffset >= fileData.length) {
            cursorOffset = fileData.length - 1;
        }

        setModified(true);
        updateFileInfo();
        renderEditor();
    }

    function fillSelection(fillValue) {
        if (!fileData || selectionStart === -1 || selectionEnd === -1) return;

        const oldValues = [];
        for (let i = selectionStart; i <= selectionEnd; i++) {
            oldValues.push(fileData[i]);
        }

        pushUndo({
            type: 'fill',
            start: selectionStart,
            end: selectionEnd,
            oldValues: oldValues,
            fillValue: fillValue
        });

        for (let i = selectionStart; i <= selectionEnd; i++) {
            fileData[i] = fillValue;
        }

        setModified(true);
        renderEditor();
    }

    // ========== Selection ==========

    function setSelection(start, end) {
        selectionStart = Math.min(start, end);
        selectionEnd = Math.max(start, end);
        cursorOffset = end;
        renderEditor();
    }

    function clearSelection() {
        selectionStart = -1;
        selectionEnd = -1;
        renderEditor();
    }

    // ========== Search & Replace ==========

    function parseSearchPattern(pattern, type) {
        if (type === 'hex') {
            const hexStr = pattern.replace(/\s/g, '');
            if (!/^[0-9A-Fa-f]*$/.test(hexStr) || hexStr.length % 2 !== 0) {
                return null;
            }
            const bytes = [];
            for (let i = 0; i < hexStr.length; i += 2) {
                bytes.push(parseInt(hexStr.substr(i, 2), 16));
            }
            return bytes;
        } else {
            const encoder = new TextEncoder();
            return Array.from(encoder.encode(pattern));
        }
    }

    function findAll(pattern) {
        if (!fileData || !pattern || pattern.length === 0) return [];

        const results = [];
        for (let i = 0; i <= fileData.length - pattern.length; i++) {
            let match = true;
            for (let j = 0; j < pattern.length; j++) {
                if (fileData[i + j] !== pattern[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                results.push(i);
            }
        }
        return results;
    }

    function search(direction = 1) {
        const searchInput = document.getElementById('search-input');
        const searchType = document.getElementById('search-type');
        const searchResultEl = document.getElementById('search-result');

        if (!searchInput?.value || !fileData) return;

        const pattern = parseSearchPattern(searchInput.value, searchType?.value || 'hex');
        if (!pattern) {
            REOT.utils?.showNotification('Invalid search pattern', 'error');
            return;
        }

        searchResults = findAll(pattern);

        if (searchResults.length === 0) {
            if (searchResultEl) searchResultEl.textContent = 'No matches found';
            clearSearchHighlight();
            return;
        }

        // Find next/prev from current position
        if (direction > 0) {
            currentSearchIndex = searchResults.findIndex(pos => pos > cursorOffset);
            if (currentSearchIndex === -1) currentSearchIndex = 0;
        } else {
            for (let i = searchResults.length - 1; i >= 0; i--) {
                if (searchResults[i] < cursorOffset) {
                    currentSearchIndex = i;
                    break;
                }
            }
            if (currentSearchIndex === -1) currentSearchIndex = searchResults.length - 1;
        }

        const matchOffset = searchResults[currentSearchIndex];
        cursorOffset = matchOffset;
        setSelection(matchOffset, matchOffset + pattern.length - 1);

        // Scroll to match
        goToOffset(matchOffset);

        if (searchResultEl) {
            searchResultEl.textContent = `${currentSearchIndex + 1} of ${searchResults.length}`;
        }
    }

    function clearSearchHighlight() {
        searchResults = [];
        currentSearchIndex = -1;
        renderEditor();
    }

    function replaceOne() {
        const replaceInput = document.getElementById('replace-input');
        const searchType = document.getElementById('search-type');

        if (selectionStart === -1 || !replaceInput?.value) return;

        const replacement = parseSearchPattern(replaceInput.value, searchType?.value || 'hex');
        if (!replacement) {
            REOT.utils?.showNotification('Invalid replacement pattern', 'error');
            return;
        }

        // Simple replace: modify bytes in selection
        const count = Math.min(replacement.length, selectionEnd - selectionStart + 1);
        for (let i = 0; i < count; i++) {
            modifyByte(selectionStart + i, replacement[i]);
        }

        clearSelection();
        search(1); // Find next
    }

    function replaceAll() {
        const searchInput = document.getElementById('search-input');
        const replaceInput = document.getElementById('replace-input');
        const searchType = document.getElementById('search-type');
        const searchResultEl = document.getElementById('search-result');

        if (!searchInput?.value || !replaceInput?.value || !fileData) return;

        const pattern = parseSearchPattern(searchInput.value, searchType?.value || 'hex');
        const replacement = parseSearchPattern(replaceInput.value, searchType?.value || 'hex');

        if (!pattern || !replacement) {
            REOT.utils?.showNotification('Invalid pattern', 'error');
            return;
        }

        const matches = findAll(pattern);
        if (matches.length === 0) {
            if (searchResultEl) searchResultEl.textContent = 'No matches';
            return;
        }

        // Replace all (from end to start to preserve offsets)
        let count = 0;
        for (let i = matches.length - 1; i >= 0; i--) {
            const offset = matches[i];
            const replaceCount = Math.min(replacement.length, pattern.length);
            for (let j = 0; j < replaceCount; j++) {
                if (fileData[offset + j] !== replacement[j]) {
                    fileData[offset + j] = replacement[j];
                }
            }
            count++;
        }

        setModified(true);
        renderEditor();

        if (searchResultEl) {
            searchResultEl.textContent = `Replaced ${count} occurrences`;
        }
        REOT.utils?.showNotification(`Replaced ${count} occurrences`, 'success');
    }

    // ========== Navigation ==========

    function goToOffset(offset) {
        if (!fileData) return;

        offset = Math.max(0, Math.min(offset, fileData.length - 1));
        cursorOffset = offset;

        // Adjust display offset if needed
        if (offset < displayOffset || offset >= displayOffset + displayLimit) {
            displayOffset = Math.max(0, offset - 1000);
        }

        renderEditor();

        // Scroll to cursor
        setTimeout(() => {
            const cursorEl = document.querySelector(`[data-offset="${offset}"]`);
            if (cursorEl) {
                cursorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }

    // ========== Byte Edit Modal ==========

    function showByteEditModal(offset) {
        if (!fileData || offset < 0 || offset >= fileData.length) return;

        const options = getOptions();
        const currentValue = byteToHex(fileData[offset], options.uppercase);

        const overlay = document.createElement('div');
        overlay.className = 'byte-input-overlay';
        overlay.innerHTML = `
            <div class="byte-input-modal">
                <h4>Edit Byte at ${formatOffset(offset, options.uppercase)}</h4>
                <input type="text" id="byte-edit-input" class="form-input"
                       value="${currentValue}" maxlength="2"
                       placeholder="00-FF">
                <div class="modal-actions">
                    <button id="byte-edit-cancel" class="btn btn--outline">Cancel</button>
                    <button id="byte-edit-confirm" class="btn btn--primary">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = document.getElementById('byte-edit-input');
        input.focus();
        input.select();

        const confirm = () => {
            const value = input.value.trim();
            if (/^[0-9A-Fa-f]{1,2}$/.test(value)) {
                modifyByte(offset, parseInt(value, 16));
            }
            document.body.removeChild(overlay);
        };

        const cancel = () => {
            document.body.removeChild(overlay);
        };

        document.getElementById('byte-edit-confirm').addEventListener('click', confirm);
        document.getElementById('byte-edit-cancel').addEventListener('click', cancel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cancel();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cancel();
        });
    }

    function showFillModal() {
        if (selectionStart === -1 || selectionEnd === -1) {
            REOT.utils?.showNotification('Please select a range first', 'warning');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'byte-input-overlay';
        overlay.innerHTML = `
            <div class="byte-input-modal">
                <h4>Fill Selection (${selectionEnd - selectionStart + 1} bytes)</h4>
                <input type="text" id="fill-value-input" class="form-input"
                       value="00" maxlength="2" placeholder="00-FF">
                <div class="modal-actions">
                    <button id="fill-cancel" class="btn btn--outline">Cancel</button>
                    <button id="fill-confirm" class="btn btn--primary">Fill</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = document.getElementById('fill-value-input');
        input.focus();
        input.select();

        const confirm = () => {
            const value = input.value.trim();
            if (/^[0-9A-Fa-f]{1,2}$/.test(value)) {
                fillSelection(parseInt(value, 16));
            }
            document.body.removeChild(overlay);
        };

        const cancel = () => {
            document.body.removeChild(overlay);
        };

        document.getElementById('fill-confirm').addEventListener('click', confirm);
        document.getElementById('fill-cancel').addEventListener('click', cancel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cancel();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirm();
            if (e.key === 'Escape') cancel();
        });
    }

    // ========== Event Handlers ==========

    function isToolActive() {
        const route = REOT.router?.getRoute();
        return route && route.includes('/tools/binary/binary-editor');
    }

    // File input change
    document.addEventListener('change', (e) => {
        if (!isToolActive()) return;

        if (e.target.id === 'file-input') {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
        }

        if (['bytes-per-line', 'show-ascii', 'uppercase'].includes(e.target.id)) {
            renderEditor();
        }
    });

    // Click events
    document.addEventListener('click', (e) => {
        if (!isToolActive()) return;

        const target = e.target;

        // Help toggle
        if (target.id === 'help-toggle-btn' || target.closest('#help-toggle-btn')) {
            const helpPanel = document.getElementById('help-panel');
            const helpToggleBtn = document.getElementById('help-toggle-btn');
            if (helpPanel && helpToggleBtn) {
                const isHidden = helpPanel.style.display === 'none';
                helpPanel.style.display = isHidden ? 'block' : 'none';
                const toggleText = helpToggleBtn.querySelector('[data-i18n]');
                if (toggleText) {
                    toggleText.textContent = isHidden
                        ? (REOT.i18n?.t('tools.binary-editor.hideHelp') || 'Hide Help')
                        : (REOT.i18n?.t('tools.binary-editor.showHelp') || 'Show Help');
                }
            }
        }

        // New file
        if (target.id === 'new-btn' || target.closest('#new-btn')) {
            newFile();
        }

        // Save file
        if (target.id === 'save-btn' || target.closest('#save-btn')) {
            saveFile();
        }

        // Undo
        if (target.id === 'undo-btn' || target.closest('#undo-btn')) {
            undo();
        }

        // Redo
        if (target.id === 'redo-btn' || target.closest('#redo-btn')) {
            redo();
        }

        // Insert byte
        if (target.id === 'insert-btn' || target.closest('#insert-btn')) {
            if (fileData) {
                insertByte(cursorOffset + 1, 0);
                REOT.utils?.showNotification('Byte inserted', 'success');
            }
        }

        // Delete byte
        if (target.id === 'delete-btn' || target.closest('#delete-btn')) {
            if (fileData) {
                deleteByte(cursorOffset);
                REOT.utils?.showNotification('Byte deleted', 'success');
            }
        }

        // Fill selection
        if (target.id === 'fill-btn' || target.closest('#fill-btn')) {
            showFillModal();
        }

        // Go to offset
        if (target.id === 'goto-btn' || target.closest('#goto-btn')) {
            const input = document.getElementById('goto-offset');
            if (input?.value) {
                const offset = parseOffset(input.value);
                if (!isNaN(offset)) {
                    goToOffset(offset);
                }
            }
        }

        // Search
        if (target.id === 'find-next-btn' || target.closest('#find-next-btn')) {
            search(1);
        }

        if (target.id === 'find-prev-btn' || target.closest('#find-prev-btn')) {
            search(-1);
        }

        // Replace
        if (target.id === 'replace-btn' || target.closest('#replace-btn')) {
            replaceOne();
        }

        if (target.id === 'replace-all-btn' || target.closest('#replace-all-btn')) {
            replaceAll();
        }

        // Load more
        if (target.id === 'load-more-btn' || target.closest('#load-more-btn')) {
            displayLimit += 50000;
            renderEditor();
        }

        // Hex byte click
        if (target.classList.contains('hex-byte') && target.dataset.offset !== undefined) {
            const offset = parseInt(target.dataset.offset, 10);
            if (e.shiftKey && cursorOffset !== -1) {
                setSelection(cursorOffset, offset);
            } else if (e.ctrlKey || e.metaKey) {
                // Double-click to edit is handled separately
                cursorOffset = offset;
                clearSelection();
            } else {
                cursorOffset = offset;
                clearSelection();
            }
        }

        // ASCII char click
        if (target.classList.contains('ascii-char') && target.dataset.offset !== undefined) {
            const offset = parseInt(target.dataset.offset, 10);
            if (e.shiftKey && cursorOffset !== -1) {
                setSelection(cursorOffset, offset);
            } else {
                cursorOffset = offset;
                clearSelection();
            }
        }
    });

    // Double-click to edit
    document.addEventListener('dblclick', (e) => {
        if (!isToolActive()) return;

        const target = e.target;
        if (target.classList.contains('hex-byte') && target.dataset.offset !== undefined) {
            const offset = parseInt(target.dataset.offset, 10);
            showByteEditModal(offset);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (!isToolActive() || !fileData) return;

        // Don't intercept if typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            // Handle Enter in goto input
            if (e.target.id === 'goto-offset' && e.key === 'Enter') {
                const offset = parseOffset(e.target.value);
                if (!isNaN(offset)) {
                    goToOffset(offset);
                }
            }
            return;
        }

        const options = getOptions();

        // Ctrl+Z - Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }

        // Ctrl+Y or Ctrl+Shift+Z - Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
            e.preventDefault();
            redo();
        }

        // Ctrl+S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveFile();
        }

        // Ctrl+G - Go to offset
        if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            document.getElementById('goto-offset')?.focus();
        }

        // Ctrl+F - Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('search-input')?.focus();
        }

        // Arrow keys for navigation
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (cursorOffset > 0) {
                cursorOffset--;
                if (e.shiftKey) {
                    if (selectionStart === -1) selectionStart = cursorOffset + 1;
                    selectionEnd = cursorOffset;
                } else {
                    clearSelection();
                }
                goToOffset(cursorOffset);
            }
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (cursorOffset < fileData.length - 1) {
                cursorOffset++;
                if (e.shiftKey) {
                    if (selectionStart === -1) selectionStart = cursorOffset - 1;
                    selectionEnd = cursorOffset;
                } else {
                    clearSelection();
                }
                goToOffset(cursorOffset);
            }
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const newOffset = cursorOffset - options.bytesPerLine;
            if (newOffset >= 0) {
                cursorOffset = newOffset;
                if (e.shiftKey) {
                    if (selectionStart === -1) selectionStart = cursorOffset + options.bytesPerLine;
                    selectionEnd = cursorOffset;
                } else {
                    clearSelection();
                }
                goToOffset(cursorOffset);
            }
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const newOffset = cursorOffset + options.bytesPerLine;
            if (newOffset < fileData.length) {
                cursorOffset = newOffset;
                if (e.shiftKey) {
                    if (selectionStart === -1) selectionStart = cursorOffset - options.bytesPerLine;
                    selectionEnd = cursorOffset;
                } else {
                    clearSelection();
                }
                goToOffset(cursorOffset);
            }
        }

        // Delete key
        if (e.key === 'Delete') {
            e.preventDefault();
            deleteByte(cursorOffset);
        }

        // Hex input (0-9, A-F)
        if (/^[0-9A-Fa-f]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            showByteEditModal(cursorOffset);
        }
    });

    // Export
    window.BinaryEditorTool = {
        newFile,
        loadFile,
        saveFile,
        goToOffset,
        modifyByte,
        insertByte,
        deleteByte
    };

})();
