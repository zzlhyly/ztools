## MODIFIED Requirements

### Requirement: Tauri errors carry machine-readable codes
All Tauri commands SHALL return structured errors with machine-readable codes emitted by the Rust backend via `thiserror` derive enums. The frontend `TauriError` wrapper SHALL parse these codes from the error string without relying on string-pattern matching.

#### Scenario: File not found during hash_file
- **WHEN** `hashFile()` is called with a path that does not exist
- **THEN** the Rust backend returns an error with code `FILE_NOT_FOUND`, and the frontend `TauriError` wrapper extracts code `FILE_NOT_FOUND` with a localized message

#### Scenario: Permission denied during hash_file
- **WHEN** `hashFile()` is called with a path the application cannot read
- **THEN** the Rust backend returns an error with code `PERMISSION_DENIED`

#### Scenario: Network error during M3U8 fetch
- **WHEN** `invokeFetchPage()` or `invokeParseM3u8()` fails due to network unavailability
- **THEN** the Rust backend returns an error with code `NETWORK_ERROR`

#### Scenario: Unrecognized error
- **WHEN** a Tauri command fails with an error that does not match any known category
- **THEN** the `TauriError` wrapper falls back to code `UNKNOWN` with the original error message

#### Scenario: Structured error from Rust thiserror
- **WHEN** a Rust `thiserror` enum variant is serialized and returned by a Tauri command
- **THEN** the error code is embedded in the error string in a parseable format (e.g., `[FILE_NOT_FOUND] path does not exist`), and the frontend `TauriError` extracts the bracketed code

### Requirement: Error messages are localized
The i18n locale files SHALL contain translations for each `TauriError` code, and UI components SHALL display the translated message.

#### Scenario: File not found in Chinese locale
- **WHEN** the application locale is `zh-CN` and `TauriError` with code `FILE_NOT_FOUND` is thrown
- **THEN** the user sees "文件不存在或已被移动"

#### Scenario: File not found in English locale
- **WHEN** the application locale is `en-US` and `TauriError` with code `FILE_NOT_FOUND` is thrown
- **THEN** the user sees "File not found or has been moved"

### Requirement: Window operation failures are surfaced
Window control functions in `src/utils/window.ts` SHALL throw errors instead of silently swallowing them with `console.error`.

#### Scenario: Minimize window fails
- **WHEN** `minimizeWindow()` fails (e.g., window already destroyed)
- **THEN** the error is thrown as `TauriError` so the caller can handle it, not just logged to console
