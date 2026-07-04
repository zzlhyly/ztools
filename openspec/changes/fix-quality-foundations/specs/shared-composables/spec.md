## ADDED Requirements

### Requirement: Clipboard copy is extracted to a shared composable
The project SHALL provide a `useClipboard` composable in `src/composables/useClipboard.ts` that encapsulates the copy-to-clipboard logic with success notification.

#### Scenario: Copy non-empty content
- **WHEN** `useClipboard(outputRef)` is called with a `Ref<string>` containing "hello world"
- **THEN** the returned function copies "hello world" to the clipboard and shows "Copied to clipboard" success message

#### Scenario: Copy empty content is a no-op
- **WHEN** `useClipboard(outputRef)` is called with a `Ref<string>` containing empty string
- **THEN** the returned function does nothing — no clipboard write, no notification

### Requirement: All tool components use the shared composable
All 14 tool Vue SFCs SHALL use `useClipboard(output)` instead of defining their own `handleCopy` function.

#### Scenario: JSON Formatter uses shared composable
- **WHEN** JSON Formatter tool is rendered
- **THEN** its copy functionality is powered by `useClipboard` from `@/composables/useClipboard`

#### Scenario: New tool can use composable without code duplication
- **WHEN** a developer adds a new tool that needs clipboard copy functionality
- **THEN** they import and use `useClipboard` in one line instead of writing a 4-line `handleCopy` function
