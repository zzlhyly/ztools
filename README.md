# ztools

A desktop toolkit application for developers, built with [Tauri v2](https://tauri.app/), [Vue 3](https://vuejs.org/), and [Element Plus](https://element-plus.org/).

[中文文档](./README_zh-CN.md)

## Features

- **JSON Formatter** - Format, minify, and validate JSON data
- **XML Formatter** - Format and validate XML data
- **Base64 Encoder/Decoder** - Encode and decode Base64 with UTF-8 support
- **URL Encoder/Decoder** - Encode and decode URLs
- **Timestamp Converter** - Convert between timestamps and dates
- **Regex Tester** - Test regular expressions with flags support
- **Color Converter** - Convert between HEX, RGB, and HSL colors
- **Hash Calculator** - Calculate SHA-1, SHA-256, SHA-384, SHA-512 hashes

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Element Plus
- **Backend**: Rust (Tauri v2)
- **Build Tool**: Vite 6
- **State Management**: Pinia
- **Internationalization**: vue-i18n (中文/English)
- **Testing**: Vitest

## Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [npm](https://www.npmjs.com/) v7+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ztools.git
cd ztools

# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run tauri dev

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## Building

```bash
# Build for production
npm run tauri build
```

The built application will be located in `src-tauri/target/release/bundle/`.

## Project Structure

```
ztools/
├── src/
│   ├── components/          # Shared components
│   │   ├── TitleBar.vue     # Custom title bar
│   │   ├── Sidebar.vue      # Navigation sidebar
│   │   └── ToolLayout.vue   # Tool page layout
│   ├── tools/               # Tool pages
│   │   ├── JsonFormatter.vue
│   │   ├── XmlFormatter.vue
│   │   ├── Base64Tool.vue
│   │   ├── UrlEncoder.vue
│   │   ├── TimestampConverter.vue
│   │   ├── RegexTester.vue
│   │   ├── ColorConverter.vue
│   │   └── HashCalculator.vue
│   ├── stores/              # Pinia stores
│   ├── router/              # Vue Router
│   ├── i18n/                # Translations
│   ├── utils/               # Utility functions
│   └── styles/              # CSS variables & global styles
├── src-tauri/               # Tauri backend (Rust)
├── docs/                    # Documentation
└── package.json
```

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Internationalization

The application supports Chinese and English. Language can be switched in the sidebar.

## License

MIT License - see [LICENSE](LICENSE) for details.
