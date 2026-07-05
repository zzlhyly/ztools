## ADDED Requirements

### Requirement: Error types are structured enums
All Rust backend errors SHALL use `thiserror` derive enums instead of bare `String`. Each enum variant SHALL carry a machine-readable error code via `#[error("...")]` that maps to the frontend `TauriError` code contract.

#### Scenario: HTTP error variant
- **WHEN** an HTTP request fails with a timeout
- **THEN** the error type contains a variant `HttpError` with the underlying `reqwest::Error` as source and a code string `NETWORK_ERROR`

#### Scenario: File error variant
- **WHEN** a file operation fails
- **THEN** the error type contains a variant `FileError` with the underlying `std::io::Error` as source and a code string matching the failure category (`FILE_NOT_FOUND`, `PERMISSION_DENIED`)

#### Scenario: Error serialization for Tauri
- **WHEN** a Tauri command returns `Err(err)`
- **THEN** the error is serialized to the frontend as a string, and the frontend `TauriError` wrapper SHALL parse the machine-readable code from it

### Requirement: Error types are backward-compatible
Existing Rust code that returns `Result<T, String>` SHALL continue to work after migration, and existing frontend callers SHALL receive errors in the same string format.

#### Scenario: Existing hash_file command after migration
- **WHEN** `hash_file` returns an error after error type migration
- **THEN** the frontend receives the same string-format error as before, and `TauriError` parsing SHALL extract a code if present or fall back to `UNKNOWN`
