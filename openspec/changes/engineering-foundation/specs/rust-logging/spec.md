## ADDED Requirements

### Requirement: Structured logging via tracing
The Rust backend SHALL use the `tracing` crate for all diagnostic output. The `tracing-subscriber` SHALL be initialized at application startup with configurable log level via the `RUST_LOG` environment variable.

#### Scenario: Default log level
- **WHEN** the application starts without `RUST_LOG` set
- **THEN** only `WARN` and `ERROR` level events are emitted

#### Scenario: Debug logging enabled
- **WHEN** `RUST_LOG=debug` is set and the application starts
- **THEN** `DEBUG`, `INFO`, `WARN`, and `ERROR` level events are emitted

#### Scenario: Module-specific log level
- **WHEN** `RUST_LOG=info,ztools_lib::m3u8=debug` is set
- **THEN** the `m3u8` module emits `DEBUG` level events while other modules emit at most `INFO`

### Requirement: Log output is human-readable
The tracing subscriber SHALL use a human-readable format suitable for terminal output, not JSON.

#### Scenario: Log line format
- **WHEN** a `WARN` event is emitted from `m3u8::downloader`
- **THEN** the output includes timestamp, level (`WARN`), module path, and message

### Requirement: Key operations are instrumented
Network requests, file I/O operations, and M3U8 download lifecycle events SHALL emit tracing events at appropriate levels.

#### Scenario: HTTP request logged
- **WHEN** `fetch_page` or `parse_m3u8` makes an HTTP request
- **THEN** a `DEBUG` event is emitted with the URL and response status

#### Scenario: Download progress logged
- **WHEN** `run_download` starts, completes, or errors
- **THEN** an `INFO` event is emitted for start/complete, and an `ERROR` event for failures with full error context
