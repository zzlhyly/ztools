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
- **Hash Calculator** - Calculate MD5, SHA-1, SHA-256, SHA-384, SHA-512, SHA3 hashes (file hashing via Rust backend)
- **AES Encrypt/Decrypt** - AES symmetric encryption with CBC/CTR/GCM modes and multiple paddings
- **RSA Key Generator** - Generate RSA public/private key pairs (1024/2048/4096 bit)
- **RSA Encrypt/Decrypt** - RSA encryption, decryption, signing, and verification
- **HMAC Calculator** - Compute HMAC message authentication codes (SHA-1/256/384/512)
- **UUID Generator** - Generate UUID v4 identifiers in batch
- **M3U8 Downloader** - Download M3U8 videos and convert to MP4 with AES-128 decryption support

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Element Plus
- **Backend**: Rust (Tauri v2)
- **Build Tool**: Vite 6
- **State Management**: Pinia
- **Internationalization**: vue-i18n (中文/English)
- **Testing**: Vitest + Rust unit tests
- **Linting**: ESLint (Vue + TypeScript) + Prettier (formatting) + cargo clippy + cargo fmt
- **CI**: GitHub Actions (ESLint → type-check → tests → build, clippy → fmt → check → test)

## Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [npm](https://www.npmjs.com/) v7+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [FFmpeg](https://ffmpeg.org/) (required for M3U8 Downloader — must be in PATH or configured in-app)

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

# Run tests (watch mode)
npm run test

# Run tests (single run)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Lint and auto-fix
npm run lint:fix
```

## Rust Logging

Set `RUST_LOG` env var to control log level:

```bash
RUST_LOG=debug npm run tauri dev     # verbose logs
RUST_LOG=info,ztools_lib::m3u8=debug npm run tauri dev  # debug for m3u8 only
```

Default level is `warn`.

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
│   │   ├── ToolLayout.vue   # Tool page layout
│   │   └── ErrorFallback.vue # Error boundary component
│   ├── composables/         # Shared composables
│   │   └── useClipboard.ts  # Clipboard copy with notification
│   ├── tools/               # Tool pages
│   │   ├── JsonFormatter.vue
│   │   ├── XmlFormatter.vue
│   │   ├── Base64Tool.vue
│   │   ├── UrlEncoder.vue
│   │   ├── TimestampConverter.vue
│   │   ├── RegexTester.vue
│   │   ├── ColorConverter.vue
│   │   ├── HashCalculator.vue
│   │   ├── AesTool.vue
│   │   ├── HmacTool.vue
│   │   ├── RsaKeyGen.vue
│   │   ├── RsaCrypto.vue
│   │   ├── UuidTool.vue
│   │   └── M3u8Downloader.vue
│   ├── stores/              # Pinia stores
│   ├── router/              # Vue Router
│   ├── i18n/                # Translations
│   ├── utils/               # Utility functions (clipboard, hash, crypto, errors, etc.)
│   ├── styles/              # CSS variables & global styles
│   └── test-setup.ts        # Global test mocks
├── .github/workflows/       # CI pipeline
│   └── ci.yml               # format → ESLint → type-check → test → build + fmt → clippy → check → test
├── src-tauri/               # Tauri backend (Rust)
│   └── src/m3u8/            # M3U8 module (playlist, decrypt, downloader, converter)
├── .prettierrc.json         # Code formatting rules
├── eslint.config.mjs        # ESLint configuration
├── lefthook.yml             # Git pre-commit hooks
├── .editorconfig            # Editor settings
├── .git-blame-ignore-revs   # Ignore formatting commits in git blame
└── package.json
```

## Testing

```bash
# Run all tests
npm run test

# Run tests (single run)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run Rust tests
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

## CI/CD

Every push and pull request to `main` runs:

- **Frontend**: format-check → ESLint → type-check (`vue-tsc`) → tests (`vitest`) → build (`vite`)
- **Backend**: format-check (`cargo fmt`) → lint (`cargo clippy`) → compile check (`cargo check`) → tests (`cargo test --lib`)

## Internationalization

The application supports Chinese and English. Language can be switched in the sidebar.

## License

MIT License - see [LICENSE](LICENSE) for details.
