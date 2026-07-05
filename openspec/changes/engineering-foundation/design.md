## Context

The project is a Tauri v2 desktop toolbox with Vue 3 frontend and Rust backend. Frontend testing is mature (241 tests, CI pipeline), but the Rust backend — which handles all network I/O, AES decryption, file system operations, and FFmpeg integration — has zero tests outside `hash_file`, no logging, no lint enforcement, and uses bare `Result<T, String>` for errors. This creates a significant observability and reliability gap.

## Goals / Non-Goals

**Goals:**
- Add structured logging to the Rust backend so failures are diagnosable
- Replace bare `String` errors with `thiserror` enums carrying machine-readable codes
- Add Rust unit tests for the `m3u8` module (playlist parser, decrypt, converter)
- Enforce `cargo clippy` and `cargo fmt` in CI
- Add ESLint to the frontend with Vue/TS rules, enforced in CI
- Add a global Vue error boundary to prevent white-screen crashes
- Add lefthook pre-commit hooks for format + lint
- Set vitest coverage thresholds at 80% lines / 80% branches

**Non-Goals:**
- End-to-end Tauri integration tests (requires running the app binary)
- Replacing `reqwest` with another HTTP client
- Adding file-based log rotation (console output is sufficient for a desktop app)
- Performance benchmarking infrastructure
- Automated dependency updates (Dependabot / Renovate)

## Decisions

### 1. `tracing` over `log`

**Decision**: Use `tracing` + `tracing-subscriber` instead of the `log` crate.

**Rationale**: `tracing` is the modern Rust ecosystem standard, integrates natively with `tokio` (which the project already uses), and supports structured spans — useful for tracking download task lifecycles. `log` is a lowest-common-denominator facade; `tracing` is the implementation.

**Subscriber format**: `tracing_subscriber::fmt()` with human-readable output and `RUST_LOG` env filter. No JSON — a desktop app doesn't need machine-parseable logs.

### 2. `thiserror` over `anyhow`

**Decision**: Use `thiserror` for error types in `lib.rs`, not `anyhow`.

**Rationale**: The project already has a `TauriError` (frontend) class expecting machine-readable `code` fields. `thiserror` derives structured enums with explicit variants, which can embed error codes. `anyhow` is for opaque, context-chained errors — it can't produce the structured codes the frontend needs for i18n. However, `anyhow` may be used inside the `m3u8` module for internal error propagation before conversion to `thiserror` types at the command boundary.

### 3. Error code embedding strategy

**Decision**: Errors cross the Tauri boundary as formatted thiserror strings with codes in bracket prefix: `[FILE_NOT_FOUND] /some/path: No such file`. The frontend `TauriError` wrapper extracts the bracketed code.

**Rationale**: Tauri commands return `Result<T, String>`. We cannot change this signature without breaking the Tauri protocol. Embedding a machine-parseable prefix in the error string is the minimal-change approach. The frontend's existing `TauriError` class already has a `code` field — we update the parsing logic to extract from `[CODE]` prefix instead of string-matching.

**Alternatives considered**:
- Serializing as JSON string: Would require frontend parsing JSON from error strings, fragile.
- Custom Tauri error type: Tauri v2 doesn't support custom error serialization in commands out of the box.
- Separate error channel (emit events): Violates the command/response model, adds complexity.

### 4. ESLint flat config (`eslint.config.mjs`)

**Decision**: Use ESLint v9+ flat config format with `eslint-plugin-vue` and `@typescript-eslint`.

**Rationale**: Flat config is the current ESLint standard; legacy `.eslintrc` is deprecated. The project uses ESM (`"type": "module"`), so `.mjs` extension is correct.

**Rule severity philosophy**: Start with `warn` for most rules to avoid overwhelming the codebase, then selectively escalate to `error` for critical rules (`vue/require-v-for-key`, `no-undef`). This balances catching issues with not blocking development.

### 5. Lefthook over husky

**Decision**: Use lefthook for pre-commit hooks.

**Rationale**: Lefthook is faster than husky (written in Go, not Node), supports parallel execution, and has native Windows support — important for a Win32 Tauri project. The `postinstall` script in `package.json` runs `lefthook install` for automatic setup.

### 6. Coverage threshold: 80%

**Decision**: Set vitest coverage thresholds at 80% lines and 80% branches, enforced in CI.

**Rationale**: The project already has good test coverage (241 tests across 29 files). 80% is a reasonable floor that prevents regression without being punitive. The `v8` provider is already configured.

**Risk**: Some tool components have scaffold tests that pass but don't deeply test logic. The 80% threshold may be aspirational and trigger CI failures on initial enforcement. Mitigation: measure current coverage first; if below 80%, set threshold at `current - 2%` and ratchet up.

### 7. Rust m3u8 test strategy

**Decision**: Unit-test `playlist::parse_m3u8` with fixture data (embedded M3U8 strings), `decrypt::decrypt_segment` with known AES-128 test vectors, and `converter` with path-based tests that skip if FFmpeg is unavailable.

**Rationale**: Playlist parsing is pure logic — easy to test with inline strings. AES decryption has known test vectors. Converter depends on FFmpeg being installed; tests check FFmpeg availability and skip gracefully.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Adding ESLint to a codebase with no prior linting may produce hundreds of warnings, overwhelming developers | Start with `warn` severity for most rules; use `eslint --fix` to auto-fix where possible |
| `RUST_LOG` env var parsing errors silently default to no output | Document in AGENTS.md that `RUST_LOG=debug` enables verbose logging |
| Error code migration may break existing frontend callers if parsing changes aren't backward-compatible | Keep fallback to `UNKNOWN` code; existing string-matching logic remains until all commands migrated |
| Coverage threshold may fail CI on first run if current coverage is below 80% | Measure first, set threshold at `max(80%, current - 2%)` |
| Lefthook may not install on all platforms | `postinstall` script uses `npx lefthook install` which should work cross-platform; add error handling for graceful failure |

## Open Questions

- **Q**: Current vitest coverage percentage? Need to measure before setting final threshold value.
- **Q**: Should `cargo clippy` use `-- -D warnings` (deny all) or `-- -W clippy::all` (warn only)? Proposal assumes deny — stricter, prevents drift.
