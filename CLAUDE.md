# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

REOT (Reverse Engineering Online Toolkit) is a **pure frontend** online toolbox for reverse engineering. All computations run locally in the browser - no server-side processing. The project targets security researchers, reverse engineers, and developers who need encoding, decoding, encryption, and data transformation tools.

**Current Status**: Project is in planning phase. Directory structure and tools are documented in README.md but not yet implemented.

## Development Commands

```bash
# Run local development server (choose one)
python -m http.server 8080
npx serve
php -S localhost:8080

# Docker deployment
docker build -t reot:latest .
docker run -d -p 80:80 reot:latest
```

## Architecture

### Tool Module Structure

Each tool follows a standard structure in `tools/<category>/<tool-name>/`:
- `index.html` - Tool page with i18n data attributes (`data-i18n="tools.<tool>.title"`)
- `<tool>.js` - Core logic wrapped in IIFE, exports to `window.<ToolName>` for testing
- `<tool>.css` - Tool-specific styles (optional)
- `README.md` - Tool documentation

### Core Systems

- **Routing**: `assets/js/router.js` - Client-side navigation
- **I18n**: `assets/js/i18n.js` - Internationalization using `data-i18n` attributes
- **Tool Registry**: `assets/js/tools-registry.js` - Tool registration via `REOT.tools.register()`
- **Utils**: `assets/js/utils.js` - Shared utilities including `REOT.utils.copyToClipboard()`

### Localization

Language files in `locales/`:
- `zh-CN.json` - Simplified Chinese (primary)
- `en-US.json` - English

Add tool translations under `tools.<tool-id>` key with `title`, `description`, and tool-specific strings.

## Code Standards

- **JavaScript**: ESLint standard, IIFE pattern for tool modules
- **CSS**: BEM naming convention
- **HTML**: Semantic tags, accessibility-compliant
- **Commits**: Conventional Commits (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`)

## Adding a New Tool

1. Create directory: `tools/<category>/<tool-name>/`
2. Implement using templates from README.md (index.html, tool.js)
3. Add i18n keys to both `locales/zh-CN.json` and `locales/en-US.json`
4. Register in `assets/js/tools-registry.js`:
```javascript
REOT.tools.register({
    id: 'tool-name',
    category: 'encoding',
    name: 'tools.tool-name.title',
    description: 'tools.tool-name.description',
    icon: 'icon-tool-name',
    path: '/tools/encoding/tool-name/',
    keywords: ['search', 'keywords']
});
```
