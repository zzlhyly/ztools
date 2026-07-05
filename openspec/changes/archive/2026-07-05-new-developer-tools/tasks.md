## 1. Infrastructure

- [x] 1.1 Add `toolInputs` field to `app.ts` Pinia store with localStorage persistence
- [x] 1.2 Update `ToolLayout.vue` to optionally support tool input memory via store
- [x] 1.3 Install npm dependencies: `js-yaml`, `sql-formatter`, `qrcode`, `diff`
- [x] 1.4 Add Rust deps to `src-tauri/Cargo.toml`: `image` (with `jpeg`, `png`, `webp` features), `encoding_rs`
- [x] 1.5 Add new Tauri commands to `src-tauri/capabilities/default.json` permissions

## 2. Password Generator

- [x] 2.1 Create `src/tools/PasswordGenerator.vue` with length slider (8-128), charset checkboxes, and generate button
- [x] 2.2 Implement entropy calculation and strength indicator display
- [x] 2.3 Add copy-to-clipboard on output click
- [x] 2.4 Add `tools.password.name` / `tools.password.description` i18n keys (zh-CN + en-US)
- [x] 2.5 Wire tool input memory: serialize password settings (length, charsets) as JSON string, parse on restore

## 3. JWT Debugger

- [x] 3.1 Create `src/tools/JwtDebugger.vue` with single input textarea for JWT token and optional public key input
- [x] 3.2 Implement JWT parsing: split by dots, base64url decode header and payload, JSON format
- [x] 3.3 Add expiration detection (check `exp` claim vs current time) and warning badge
- [x] 3.4 Add per-section copy buttons (Header, Payload, Signature)
- [x] 3.5 Add signature verification section: accept optional PEM/JWK public key, verify via Web Crypto
- [x] 3.6 Add signature status badge (Not Verified / Verified ✓ / Invalid ✗)
- [x] 3.7 Add `tools.jwt.name` / `tools.jwt.description` i18n keys
- [x] 3.8 Wire tool input memory

## 4. YAML ↔ JSON Converter

- [x] 4.1 Create `src/tools/YamlConverter.vue` with single textarea + direction toggle button
- [x] 4.2 Implement YAML→JSON conversion using `js-yaml`
- [x] 4.3 Implement JSON→YAML conversion using `js-yaml`
- [x] 4.4 Add direction toggle with mode memory during session
- [x] 4.5 Add `tools.yaml.name` / `tools.yaml.description` i18n keys
- [x] 4.6 Wire tool input memory

## 5. SQL Formatter

- [x] 5.1 Create `src/tools/SqlFormatter.vue` with single textarea + format button
- [x] 5.2 Implement SQL formatting using `sql-formatter` with default keyword uppercase config
- [x] 5.3 Add syntax error detection and inline warning badge
- [x] 5.4 Add `tools.sql.name` / `tools.sql.description` i18n keys
- [x] 5.5 Wire tool input memory

## 6. QR Code Generator

- [x] 6.1 Create `src/tools/QrcodeGenerator.vue` with text input + size slider + color pickers
- [x] 6.2 Implement QR generation using `qrcode` npm package, render as inline SVG
- [x] 6.3 Add responsive size slider (128-1024px) with live preview
- [x] 6.4 Add foreground/background color pickers
- [x] 6.5 Add download button: SVG direct download and PNG export (render SVG to offscreen canvas → canvas.toBlob for download)
- [x] 6.6 Add `tools.qrcode.name` / `tools.qrcode.description` i18n keys
- [x] 6.7 Wire tool input memory: serialize QR settings (size, colors) as JSON, restore text input separately

## 7. Text Diff

- [x] 7.1 Create `src/tools/TextDiff.vue` with two textareas (A and B) side by side
- [x] 7.2 Implement unified diff computation using `diff` npm package
- [x] 7.3 Build side-by-side diff view with color-coded additions/removals/unchanged
- [x] 7.4 Add unified diff format toggle (side-by-side vs git-diff style)
- [x] 7.5 Add "Clear" and "Swap" buttons
- [x] 7.6 Add `tools.diff.name` / `tools.diff.description` i18n keys
- [x] 7.7 Wire tool input memory

## 8. CIDR Calculator

- [x] 8.1 Create `src/tools/CidrCalculator.vue` with single CIDR input
- [x] 8.2 Implement CIDR parsing with pure JS bitwise operations (no library)
- [x] 8.3 Display: network address, broadcast, host range, host count, subnet mask, wildcard mask
- [x] 8.4 Add IPv4 validation and prefix range validation (0-32)
- [x] 8.5 Add `tools.cidr.name` / `tools.cidr.description` i18n keys
- [x] 8.6 Wire tool input memory

## 9. Ed25519 Tool

- [x] 9.1 Create `src/tools/Ed25519Tool.vue` with key generation, sign, and verify panels
- [x] 9.2 Add Ed25519 feature detection on mount: test `crypto.subtle.generateKey({ name: 'Ed25519' }, ...)`, show "Not supported" message if unavailable
- [x] 9.3 Implement Ed25519 key pair generation via Web Crypto API
- [x] 9.4 Implement sign operation via `crypto.subtle.sign`
- [x] 9.5 Implement verify operation via `crypto.subtle.verify`
- [x] 9.6 Add JWK ↔ PEM format toggle for key display
- [x] 9.7 Add `tools.ed25519.name` / `tools.ed25519.description` i18n keys
- [x] 9.8 Wire tool input memory

## 10. Image Converter (Tauri Backend)

- [x] 10.1 Add `image` crate to `src-tauri/Cargo.toml`
- [x] 10.2 Implement `convert_image` Tauri command in `src-tauri/src/lib.rs` (accept path, format; return output path + sizes)
- [x] 10.3 Create `src/tools/ImageConverter.vue` with drag-drop zone, format selector
- [x] 10.4 Display input file info (name, format, dimensions, size) on drop
- [x] 10.5 Add download button for converted file
- [x] 10.6 Register `convert_image` in `invoke_handler`
- [x] 10.7 Add `tools.image.name` / `tools.image.description` i18n keys
- [x] 10.8 Wire tool input memory (for format settings)

## 11. Encoding Converter (Tauri Backend)

- [x] 11.1 Add `encoding_rs` crate to `src-tauri/Cargo.toml`
- [x] 11.2 Implement `detect_encoding` and `convert_encoding` Tauri commands
- [x] 11.3 Create `src/tools/EncodingConverter.vue` with drag-drop zone, encoding display, target selector
- [x] 11.4 Display detected encoding + confidence on file drop
- [x] 11.5 Show file preview features
- [ ] 11.6 Add download button for converted file — skipped (Tauri file download needs extra plumbing, will add in follow-up)
- [x] 11.7 Register commands in `invoke_handler`
- [x] 11.8 Add `tools.encoding.name` / `tools.encoding.description` i18n keys
- [x] 11.9 Wire tool input memory (for target encoding preference)

## 12. Integration: Router & Sidebar

- [x] 12.1 Add 11 new lazy-loaded routes to `src/router/index.ts`
- [x] 12.2 Add 11 new tool entries to `src/components/Sidebar.vue` with lucide icons
- [x] 12.3 Order sidebar entries by category

## 13. Verification

- [x] 13.1 Run `cargo check` to verify no Rust build errors
- [x] 13.2 Run `npm run test:run` — 30 files, 256 tests, all passing
- [x] 13.3 Run `npm run lint` — 0 errors, 58 warnings (all pre-existing)
- [x] 13.4 Run `npx prettier --check` — All matched files use Prettier code style!
- [ ] 13.5 Manual smoke test: launch app, click each new tool, verify basic functionality
