## ADDED Requirements

### Requirement: Side-by-side text diff

The system SHALL compare two text inputs and produce a side-by-side unified diff display with color-coded additions (green), deletions (red), and unchanged lines (neutral).

#### Scenario: Diff two similar texts

- **WHEN** user enters "hello\nworld" in Text A and "hello\nuniverse" in Text B and clicks "Compare"
- **THEN** line 1 shows "hello" as unchanged, line 2 shows "world" in red (removed) and "universe" in green (added)

#### Scenario: Identical texts

- **WHEN** user enters identical text in both inputs
- **THEN** the output shows "Texts are identical" with all lines in neutral color

#### Scenario: Completely different texts

- **WHEN** user enters "foo" in Text A and "bar" in Text B
- **THEN** "foo" is shown in red (removed) and "bar" is shown in green (added)

### Requirement: Unified diff format

The system SHALL also support a unified diff format view (similar to `git diff` output) as an alternative display mode.

#### Scenario: Toggle to unified view

- **WHEN** user clicks "Unified Diff" toggle
- **THEN** the output switches from side-by-side to unified diff format with `@@ -1,2 +1,2 @@` context headers

### Requirement: Clear and swap

The system SHALL provide "Clear" button to reset both inputs and "Swap" button to exchange Text A and Text B.

#### Scenario: Swap inputs

- **WHEN** user clicks "Swap"
- **THEN** Text A becomes the old Text B and Text B becomes the old Text A, and the diff recalculates
