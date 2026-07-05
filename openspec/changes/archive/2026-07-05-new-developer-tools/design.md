## Context

ztools currently has 15 tools across format/encode, crypto, and utility categories. Every tool follows the same Vue component pattern: `<ToolLayout>` wrapper with named slots for input panel, action bar, and output panel. The Rust backend provides 8 Tauri commands, mostly for M3U8 downloading and file hashing. New tools fall into two categories: (1) pure-frontend tools using existing npm deps or new small deps, and (2) backend-powered tools that need new Rust commands.

## Goals / Non-Goals

**Goals:**

- Add 11 new developer tools following the existing component architecture
- Add tool input memory (persist inputs across tool switches)
- Leverage Rust backend for image conversion and encoding detection
- Keep all new tools consistent with existing UX patterns

**Non-Goals:**

- Refactoring existing tools or shared components
- Adding tool-specific settings/preferences beyond input memory
- Implementing tool export/import or configuration backup
- Changing the sidebar navigation structure

## Decisions

### 1. Pure-frontend vs backend tools

**Decision**: 9 tools are pure frontend (JWT, YAML, SQL, QR, password, text diff, CIDR, tool memory, Ed25519 key gen using Web Crypto). 2 tools use Rust backend (image conversion, encoding detection).

**Rationale**: Ed25519 keygen can use the existing Web Crypto API (`crypto.subtle`) like RSA tools already do. Image conversion needs the `image` crate in Rust for performance and format coverage. Encoding detection needs `encoding_rs` which isn't available in the browser.

**Alternatives considered**:

- Ed25519 via Rust: Already have `ring` as a dep, but Web Crypto's Ed25519 support is sufficient for a dev tool. Avoids new Rust command for now.
- QR via Rust: `qrcode` crate generates beautiful SVG in Rust, but frontend `qrcode` npm package is simpler and avoids plumbing Tauri commands for a tool with no file I/O.

### 2. Tool component pattern

**Decision**: All new tools use the existing `<ToolLayout>` / `<ToolTextarea>` / `<CodeOutput>` / `<ToolActionBar>` slot-based component pattern.

**Rationale**: Every existing tool uses this pattern. It gives consistent layout, copy buttons, language selectors, and responsive behavior for free. No new shared components needed.

### 3. Dependency choices

| Tool     | Dependency                 | Rationale                                          |
| -------- | -------------------------- | -------------------------------------------------- |
| YAML     | `js-yaml`                  | Most popular YAML JS lib, 200KB, zero deps         |
| SQL      | `sql-formatter`            | Format + keyword uppercase, 30KB                   |
| QR Code  | `qrcode` (npm)             | Generates SVG natively, 40KB                       |
| Diff     | `diff` (npm)               | Small, mature, produces patch objects              |
| Image    | `image` crate (Rust)       | Best Rust image lib, supports all target formats   |
| Encoding | `encoding_rs` crate (Rust) | Firefox's encoding lib, handles GBK/Shift-JIS/etc. |
| Ed25519  | None (Web Crypto API)      | `crypto.subtle.generateKey` with `Ed25519`         |

### 4. Tool input memory implementation

**Decision**: Extend `app.ts` Pinia store with a `toolInputs: Record<string, string>` field persisted to localStorage alongside `recentTools`. Tools with complex state (password generator settings, QR code colors) serialize their state as JSON strings. Each tool component reads/writes via `watch` on its input ref.

**Rationale**: Using `Record<string, string>` keeps the store simple. Tools needing structured data (objects, numbers) JSON-serialize the value before storing and parse on restore. This avoids bloating the store type with per-tool schemas.

### 5. Icons from existing dependency

**Decision**: All new tool sidebar icons come from `lucide-vue-next` (already a project dependency).

| Tool               | Lucide Icon      |
| ------------------ | ---------------- |
| JWT Debugger       | `Ticket`         |
| YAML ↔ JSON        | `ArrowLeftRight` |
| SQL Formatter      | `Database`       |
| Image Converter    | `Image`          |
| QR Code            | `QrCode`         |
| Encoding Converter | `FileText`       |
| Password Generator | `Key`            |
| Ed25519            | `Hexagon`        |
| Text Diff          | `GitCompare`     |
| CIDR Calculator    | `Network`        |

## Risks / Trade-offs

- **Dependency bloat**: Adding `js-yaml`, `sql-formatter`, `qrcode`, `diff` (~300KB total). Mitigation: all are well-maintained, tree-shakeable packages.
- **Image crate compilation**: Adding `image` crate may slow Rust compilation by 30-60s on first build. Mitigation: acceptable for a Rust desktop app; cached on subsequent builds.
- **Ed25519 via Web Crypto**: Chromium 113+ and Firefox support Ed25519 in SubtleCrypto, but some Linux WebKitGTK versions may not. Mitigation: add a feature-detection check (`crypto.subtle.generateKey({ name: 'Ed25519' }, ...)`) on tool mount; if unsupported, display a clear "Not supported in this browser" message with a suggestion to upgrade the WebView.
- **CIDR calculation**: Node.js/Browser has no built-in IP math. Mitigation: implement with simple bitwise operations — no library needed.
- **AVIF encoding**: The `image` crate's AVIF support requires the `ravif` encoder as a transitive dependency and must be gated behind a feature flag (`avif`). Mitigation: enable AVIF only if `ravif` compiles cleanly; fall back to WebP as the default next-gen format if AVIF is unavailable.
- **`image` crate features**: Default features include only a subset of codecs. Mitigation: explicitly enable `jpeg`, `png`, `webp` features in `Cargo.toml` (`image = { version = "...", default-features = false, features = ["jpeg", "png", "webp"] }`).
