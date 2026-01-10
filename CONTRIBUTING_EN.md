# Contributing Guide

[English](./CONTRIBUTING_EN.md) | [简体中文](./CONTRIBUTING.md)

---

Thank you for your interest in REOT (Reverse Engineering Online Toolkit)! We welcome all forms of contributions, including but not limited to:

- Submitting bug reports
- Proposing new features
- Improving documentation
- Submitting code fixes or new features
- Adding new language support

## Online Access

- **Official Website**: [https://reot.dev](https://reot.dev)
- **GitHub Pages**: [https://evil0ctal.github.io/Reverse-Engineering-Online-Toolkit](https://evil0ctal.github.io/Reverse-Engineering-Online-Toolkit)

## Development Environment Setup

### Prerequisites

- Modern browser (Chrome, Firefox, Safari, Edge)
- Git
- Docker (recommended) or Node.js

### Local Development

Since this project is a SPA (Single Page Application), it requires server support for route redirection.

```bash
# Clone the repository
git clone https://github.com/Evil0ctal/Reverse-Engineering-Online-Toolkit.git
cd Reverse-Engineering-Online-Toolkit

# Method 1: Use Docker Compose (recommended, supports hot reload)
docker-compose up -d

# Method 2: Use Node.js serve (with SPA support)
npx serve -s -l 8080

# Method 3: Use npm scripts
npm run serve

# Visit http://localhost:8080
```

> **Note**: Simple HTTP servers (like `python -m http.server`) don't support SPA routing. Directly accessing tool page URLs will result in 404 errors.

## How to Contribute

### Reporting Bugs

1. Make sure the bug hasn't been reported yet by searching [Issues](https://github.com/Evil0ctal/Reverse-Engineering-Online-Toolkit/issues)
2. If no related Issue exists, create a new one
3. Provide detailed reproduction steps, expected behavior, and actual behavior
4. If possible, provide screenshots or screen recordings

### Proposing New Features

1. First create an Issue to discuss your idea
2. Get approval from maintainers before starting development
3. Follow the code standards and submission process below

### Contributing Code

#### 1. Fork and Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Reverse-Engineering-Online-Toolkit.git
cd Reverse-Engineering-Online-Toolkit
```

#### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

#### 3. Write Code

Follow the project's code standards:

- **JavaScript**: Use ESLint standard configuration
- **CSS**: Follow BEM naming convention
- **HTML**: Use semantic tags

#### 4. Commit Code

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
git commit -m "feat(encoding): add Base64 URL-safe encoding support"
git commit -m "fix(hashing): fix MD5 calculation for Chinese characters"
git commit -m "docs: update README installation instructions"
```

Commit types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code format adjustment (no functional changes)
- `refactor`: Code refactoring
- `test`: Testing related
- `chore`: Build/tooling related

#### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Adding New Tools

### Directory Structure

```
tools/<category>/<tool-name>/
├── <tool-name>.html   # Tool page (named by tool ID)
├── <tool-name>.js     # Core logic
├── <tool-name>.css    # Tool styles (optional)
├── README.md          # Tool documentation
└── locales/           # Tool-specific i18n (recommended)
    ├── zh-CN.json
    └── en-US.json
```

> **Important**: Tool files must be named by tool ID (e.g., `base64.html`, `base64.js`), not `index.html`. This prevents returning HTML fragments when directly accessing URLs.

### Implementation Steps

1. Create tool directory
2. Implement HTML page (use data-i18n attributes for internationalization)
3. Implement JavaScript logic (use IIFE pattern)
4. Add internationalization support (see detailed instructions below)
5. Register tool in `assets/js/tools-registry.js`
6. Write tool documentation

For detailed templates, refer to the "How to Contribute New Features/Tools" section in [README_EN.md](./README_EN.md).

### Modular Internationalization

REOT uses a **modular internationalization architecture** where tool translations are divided into two parts:

**1. Root locales (required)** - For sidebar and search

Add tool `title` and `description` to the `tools` object in `locales/zh-CN.json` and `locales/en-US.json`:

```json
{
    "tools": {
        "my-tool": {
            "title": "My Tool",
            "description": "Tool description"
        }
    }
}
```

**2. Tool directory locales (recommended)** - Detailed tool translations

Create a `locales/` folder under the tool directory for tool-specific translations:

```
tools/<category>/<tool-name>/locales/
├── zh-CN.json
└── en-US.json
```

Tool locales file format (no `tools.my-tool` prefix needed):

```json
{
    "title": "My Tool",
    "description": "Tool description",
    "placeholder": "Enter content",
    "customOption": "Custom option"
}
```

The system will automatically merge tool locales into the `tools.<tool-id>` namespace.

**Advantages**:
- Tools are fully self-contained, easy to add/remove
- On-demand loading, improves performance
- Avoids Git merge conflicts

## Adding New Language Support

### Adding Global Translations

1. Copy `locales/en-US.json` to a new file (e.g., `locales/ja-JP.json`)
2. Translate all text
3. Add the new language code to the `supportedLocales` array in `assets/js/i18n.js`
4. Submit PR

### Adding Tool Translations

1. Find the `locales/` folder under the tool directory (e.g., `tools/formatting/json/locales/`)
2. Copy `en-US.json` and rename to the new language code
3. Translate all text
4. Submit PR

> **Note**: Tool translations are optional. If a tool doesn't have a translation file for a language, the system will fall back to `zh-CN`.

## Code Standards

### JavaScript

```javascript
/**
 * Function description
 * @param {string} input - Input parameter description
 * @returns {string} - Return value description
 */
function myFunction(input) {
    'use strict';
    // Implementation
}
```

### CSS (BEM)

```css
/* Block */
.tool-container {}

/* Element */
.tool-container__header {}
.tool-container__input {}

/* Modifier */
.tool-container--dark {}
.tool-container__input--error {}
```

### HTML

```html
<!-- Use semantic tags -->
<section class="tool-section">
    <header class="tool-header">
        <h1 data-i18n="tools.my-tool.title">Title</h1>
    </header>
    <main class="tool-main">
        <!-- Content -->
    </main>
</section>
```

## Testing

Before submitting a PR, please ensure:

1. All existing features work correctly
2. New features are tested in major browsers
3. Responsive design displays correctly at different screen sizes
4. Internationalized text displays correctly

## Code of Conduct

- Respect all contributors
- Maintain friendly and professional communication
- Accept constructive criticism
- Focus on the best interests of the project

## License

By contributing code to this project, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).

## Contact Us

If you have any questions, please contact us through:

- GitHub Issues: [Submit an issue](https://github.com/Evil0ctal/Reverse-Engineering-Online-Toolkit/issues)
- GitHub: [@Evil0ctal](https://github.com/Evil0ctal)

Thank you for your contribution!
