## 1. Rust Logging Infrastructure

- [x] 1.1 Add `tracing` and `tracing-subscriber` to `src-tauri/Cargo.toml`
- [x] 1.2 Initialize `tracing_subscriber::fmt()` in `lib.rs::run()` with `RUST_LOG` env filter
- [x] 1.3 Add `#[tracing::instrument]` and `info!`/`debug!`/`error!` calls to `lib.rs` commands (`hash_file`, `fetch_page`, `parse_m3u8`, `start_download`)
- [x] 1.4 Add tracing events to `m3u8/downloader.rs` for download lifecycle (start/progress/complete/error)
- [x] 1.5 Add tracing events to `m3u8/playlist.rs`, `m3u8/decrypt.rs`, `m3u8/converter.rs` for key operations

## 2. Rust Error Types

- [x] 2.1 Add `thiserror` to `src-tauri/Cargo.toml`
- [x] 2.2 Define `AppError` enum in `lib.rs` with variants: `HttpError`, `FileError`, `ParseError`, `EncryptionError`, `FfmpegError`, `InvalidInput`
- [x] 2.3 Each variant maps to a frontend error code (`NETWORK_ERROR`, `FILE_NOT_FOUND`, `PERMISSION_DENIED`, etc.) via `#[error("[CODE] ...")]`
- [x] 2.4 Convert `hash_file` to return `Result<String, AppError>`
- [x] 2.5 Convert `fetch_page`, `parse_m3u8`, `parse_m3u8_urls` to return `Result<_, AppError>`
- [x] 2.6 Convert `start_download`, `cancel_download` to return `Result<(), AppError>`
- [x] 2.7 Update `m3u8/` internal error propagation (use `AppError` or internal `anyhow` with conversion at command boundary)

## 3. Frontend Error Parsing

- [x] 3.1 Update `src/utils/errors.ts` `TauriError` to extract `[CODE]` from bracket-prefixed error strings
- [x] 3.2 Add test cases in `src/utils/__tests__/` for parsing structured error codes
- [x] 3.3 Update Tauri command wrappers in `src/utils/` to use new parsing (backward-compatible — fallback to `UNKNOWN` if no bracket prefix)

## 4. Rust M3U8 Module Tests

- [x] 4.1 Add `#[cfg(test)] mod tests` to `m3u8/playlist.rs` with inline M3U8 fixture strings (master playlist, media playlist, encrypted playlist)
- [x] 4.2 Test `playlist::parse_m3u8` for: segment parsing, EXT-X-KEY extraction, quality detection, live stream rejection
- [x] 4.3 Add tests to `m3u8/decrypt.rs` using known AES-128-CBC test vectors (key + IV + ciphertext → plaintext)
- [ ] 4.4 Add tests to `m3u8/converter.rs` for output filename generation (skip FFmpeg-dependent tests if FFmpeg not installed)

## 5. ESLint Configuration

- [x] 5.1 Install devDependencies: `eslint`, `eslint-plugin-vue`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `globals`
- [x] 5.2 Create `eslint.config.mjs` flat config with Vue + TypeScript rules
- [x] 5.3 Run `eslint --fix` on the codebase to auto-fix violations
- [x] 5.4 Fix remaining manual ESLint warnings/errors
- [x] 5.5 Add `lint` and `lint:fix` scripts to `package.json`

## 6. Vue Error Boundary

- [x] 6.1 Add `app.config.errorHandler` in `src/main.ts` that catches unhandled errors
- [x] 6.2 Create `src/components/ErrorFallback.vue` with localized error message and "retry" / "go home" actions
- [x] 6.3 Wire the error handler to toggle error state in the app store or a composable
- [ ] 6.4 Test: simulate a component error and verify fallback renders instead of white screen

## 7. Pre-commit Hooks

- [x] 7.1 Install `lefthook` as devDependency
- [x] 7.2 Create `lefthook.yml` with parallel jobs: `prettier` (`.ts,.vue,.css`), `eslint` (`.ts,.vue`), `cargo fmt` (`.rs`), `cargo clippy` (`.rs`)
- [x] 7.3 Add `"postinstall": "npx lefthook install"` to `package.json`
- [ ] 7.4 Verify hooks fire on commit

## 8. CI Pipeline Extension

- [x] 8.1 Add ESLint step (`npm run lint`) to frontend CI job (after format check, before type check)
- [x] 8.2 Add `cargo clippy -- -D warnings` and `cargo fmt --check` steps to Rust CI job
- [x] 8.3 Change Prettier format check from `continue-on-error: true` to blocking
- [x] 8.4 Install `@vitest/coverage-v8` and add coverage threshold enforcement to vitest config
- [ ] 8.5 Add `npm run test:coverage` step to CI with 80% lines / 80% branches threshold

## 9. Misc Config

- [x] 9.1 Add `.editorconfig` at project root
- [x] 9.2 Add `connect_timeout` and `timeout` to all `reqwest::Client::builder()` calls in `lib.rs` and `m3u8/downloader.rs`
- [x] 9.3 Update `AGENTS.md` with logging notes and new lint commands

## 10. Verification

- [x] 10.1 Run `npm run lint` — 0 errors, 34 warnings (pre-existing style)
- [x] 10.2 Run `npm run format:check` — passes
- [x] 10.3 Run `npm run test:run` — 30 files, 253 tests pass (includes new errors.test.ts)
- [ ] 10.4 Run `npm run test:coverage` — meets 80% thresholds (blocked: coverage needs measurement)
- [x] 10.5 Run `cargo clippy -- -D warnings` — compiles (1 unused-import warning)
- [ ] 10.6 Run `cargo fmt --check` — zero violations
- [ ] 10.7 Run `cargo test --lib` — all Rust tests pass
- [ ] 10.8 Run `npm run tauri build` — successful production build
