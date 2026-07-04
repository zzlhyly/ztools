## ADDED Requirements

### Requirement: Tauri errors carry machine-readable codes
All Tauri command wrappers in `src/utils/` SHALL catch invocation failures and throw `TauriError` instances with a `code` field categorizing the error.

#### Scenario: File not found during hash_file
- **WHEN** `hashFile()` is called with a path that does not exist
- **THEN** it throws a `TauriError` with code `FILE_NOT_FOUND` and a human-readable message

#### Scenario: Permission denied during hash_file
- **WHEN** `hashFile()` is called with a path the application cannot read
- **THEN** it throws a `TauriError` with code `PERMISSION_DENIED`

#### Scenario: Network error during M3U8 fetch
- **WHEN** `invokeFetchPage()` or `invokeParseM3u8()` fails due to network unavailability
- **THEN** it throws a `TauriError` with code `NETWORK_ERROR`

#### Scenario: Unrecognized error
- **WHEN** a Tauri command fails with an error that does not match any known category
- **THEN** it throws a `TauriError` with code `UNKNOWN` and the original error message

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
