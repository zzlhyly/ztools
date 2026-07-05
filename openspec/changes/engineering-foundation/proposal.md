## Why

The project has solid frontend coverage (29 test files, 241 tests, CI pipeline) but lacks engineering infrastructure on the Rust side — the backend that handles all network I/O, crypto, and file operations has zero tests outside `hash_file`, no logging, no lint enforcement, and no structured error types. Every backend failure is a black box at 3AM.

## What Changes

- Add `tracing` crate for structured Rust logging across all backend modules
- Replace bare `Result<T, String>` with `thiserror` enum types, emitting machine-readable error codes that align with the existing `TauriError` (frontend) contract
- Enforce `cargo clippy` (deny warnings) and `cargo fmt --check` in CI
- Add unit tests for `m3u8` module (playlist parser, AES decrypt, converter pipeline)
- Add ESLint (`eslint-plugin-vue`, `@typescript-eslint`) with a reasonable config; enforce in CI
- Configure `app.config.errorHandler` as a global Vue error boundary in `main.ts`
- Add `connect_timeout` and `timeout` to all `reqwest::Client` builders
- Add lefthook pre-commit hooks for Prettier + ESLint + clippy + rustfmt
- Set vitest coverage thresholds (80% lines, 80% branches) enforced in CI

## Capabilities

### New Capabilities

- `rust-logging`: Structured logging via `tracing` + `tracing-subscriber` with log level control
- `rust-error-types`: `thiserror`-based error enums with machine-readable codes matching `TauriError` contract
- `eslint-config`: ESLint configuration with `eslint-plugin-vue` and `@typescript-eslint`, enforced in CI
- `vue-error-boundary`: Global `app.config.errorHandler` in `main.ts` for graceful crash handling
- `pre-commit-hooks`: Lefthook-based pre-commit hooks for formatting and linting

### Modified Capabilities

- `ci-pipeline`: Add ESLint job, Rust clippy + rustfmt jobs, coverage threshold enforcement. Format check changes from non-blocking to blocking.
- `error-localization`: Rust side now natively emits structured error codes via `thiserror`; frontend `TauriError` wrapper parses structured errors instead of string matching. Backward-compatible — existing callers work unchanged.

## Impact

- **Rust**: `src-tauri/Cargo.toml` (new deps: `tracing`, `tracing-subscriber`, `thiserror`), `src-tauri/src/lib.rs` (init tracing, error types), `src-tauri/src/m3u8/*.rs` (error type migration, logging, tests)
- **Frontend**: `package.json` (new devDeps: `eslint`, `eslint-plugin-vue`, `@typescript-eslint/*`, `lefthook`), `src/main.ts` (error handler), `src/utils/*.ts` (TauriError parsing for structured errors)
- **CI**: `.github/workflows/ci.yml` (extended)
- **Config**: new `eslint.config.mjs`, `lefthook.yml`, `.editorconfig`
- **No breaking changes** — all Rust error changes are backward-compatible with existing `TauriError` frontend code
