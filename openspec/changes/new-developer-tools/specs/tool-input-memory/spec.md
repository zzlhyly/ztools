## ADDED Requirements

### Requirement: Save tool input on navigation

The system SHALL persist each tool's input text in localStorage when the user navigates away from a tool. The system SHALL restore the input text when the user returns to that tool.

#### Scenario: Return to tool after navigating away

- **WHEN** user types "SELECT * FROM users" in SQL Formatter, switches to JSON Formatter, then returns to SQL Formatter
- **THEN** "SELECT * FROM users" is still in the SQL Formatter input

#### Scenario: First visit to a tool

- **WHEN** user navigates to a tool they have never used before
- **THEN** the input is empty (default state)

### Requirement: Clear persisted input

The system SHALL provide a "Clear" button that resets the current tool's input AND removes the persisted value from storage.

#### Scenario: Clear and persist

- **WHEN** user has "hello" in a tool's input, clicks "Clear"
- **THEN** the input is emptied and navigating away and back still shows empty input

### Requirement: Implementation via Pinia store

The system SHALL implement input memory using the existing `app.ts` Pinia store with a `toolInputs: Record<string, string>` field persisted to localStorage via `pinia-plugin-persistedstate`. Tools with complex state (password settings, QR colors) SHALL serialize their state as JSON strings. Each tool component SHALL use `watch` on its input ref to sync with the store.

#### Scenario: Store complex settings

- **WHEN** user configures password generator (length=32, digits+symbols enabled)
- **THEN** the settings are serialized to JSON `{"length":32,"upper":false,"lower":false,"digits":true,"symbols":true}` and stored under key `tools/password`

#### Scenario: Store persistence across page reload

- **WHEN** user types "test" in a tool and refreshes the page
- **THEN** "test" is restored in the tool's input
