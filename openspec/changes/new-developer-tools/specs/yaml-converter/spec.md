## ADDED Requirements

### Requirement: YAML to JSON conversion

The system SHALL accept YAML input and produce formatted JSON output. The system SHALL report syntax errors with line and column information.

#### Scenario: Basic YAML to JSON

- **WHEN** user enters `name: Alice\nage: 30` and clicks "Convert to JSON"
- **THEN** output shows `{\n  "name": "Alice",\n  "age": 30\n}`

#### Scenario: Invalid YAML

- **WHEN** user enters `name: [unclosed` and clicks "Convert to JSON"
- **THEN** an error message with line number is displayed

### Requirement: JSON to YAML conversion

The system SHALL accept JSON input and produce formatted YAML output with proper indentation.

#### Scenario: Basic JSON to YAML

- **WHEN** user enters `{"name":"Alice","age":30}` and clicks "Convert to YAML"
- **THEN** output shows `name: Alice\nage: 30`

### Requirement: Bidirectional toggle

The system SHALL provide a toggle button to switch between YAML→JSON and JSON→YAML modes. The system SHALL remember the last used mode during the session.

#### Scenario: Toggle direction

- **WHEN** user is in YAML→JSON mode and clicks the toggle button
- **THEN** the direction switches to JSON→YAML and output is re-converted
