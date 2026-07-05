## Why

ztools has 15 tools covering format/encode, crypto, and utility domains — but there are glaring gaps that every developer encounters daily. JWT debugging, YAML conversion, SQL formatting, image compression, password generation — these are table-stakes for a developer toolbox. Adding 11 new tools and one cross-cutting feature (tool input memory) will make ztools a comprehensive, go-to utility suite.

## What Changes

- **11 new tools** spanning format, crypto, media, and utility categories
- **Tool input memory**: inputs persist across tool switches using localStorage
- All new tools follow the existing `ToolLayout` + `ToolTextarea` + `CodeOutput` pattern
- Two tools (image conversion, encoding detection) add 3 new Tauri backend commands — `convert_image`, `detect_encoding`, `convert_encoding`
- No breaking changes to existing tools

## Capabilities

### New Capabilities

- `jwt-debugger`: Decode and inspect JWT tokens — parse Header and Payload as JSON, detect expiration, show signature status
- `yaml-converter`: Bidirectional YAML ↔ JSON conversion with formatted output
- `sql-formatter`: Format and keyword-uppercase SQL queries with syntax highlighting
- `image-converter`: Convert between PNG/JPEG/WebP/AVIF formats and compress images using Rust `image` crate via Tauri backend
- `qrcode-generator`: Generate QR codes from text/URLs as SVG, with configurable size and colors
- `encoding-converter`: Detect and convert text file encodings (UTF-8, GBK, Shift-JIS, etc.) using Rust `encoding_rs` via Tauri backend
- `password-generator`: Generate secure random passwords with configurable length, character sets, and entropy display
- `ed25519-tool`: Generate Ed25519 key pairs, sign/verify data, export in JWK and PEM formats using Web Crypto API
- `text-diff`: Side-by-side unified diff comparison of two text inputs with color-coded changes
- `cidr-calculator`: Parse CIDR notation, compute network/broadcast/host-count/subnet-mask
- `tool-input-memory`: Automatically save and restore each tool's input text when switching tools (Pinia + localStorage)

### Modified Capabilities

- None — all existing capabilities remain unchanged

## Impact

- **Frontend**: 11 new Vue SFC files in `src/tools/`, new routes in `src/router/index.ts`, new sidebar entries in `src/components/Sidebar.vue`, new i18n keys in `zh-CN.ts` and `en-US.ts`
- **Backend (Tauri/Rust)**: 3 new Tauri commands (`convert_image`, `detect_encoding`, `convert_encoding`) in `src-tauri/src/lib.rs`; new cargo deps: `image`, `encoding_rs`
- **State**: Extended `app.ts` Pinia store with `toolInputs: Record<string, string>` persisted to localStorage
- **Dependencies**: `js-yaml` (npm), `sql-formatter` (npm), `qrcode` (npm), `diff` (npm), `image` (cargo), `encoding_rs` (cargo)
