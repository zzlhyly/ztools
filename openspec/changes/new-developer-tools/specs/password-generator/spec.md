## ADDED Requirements

### Requirement: Password generation

The system SHALL generate secure random passwords of configurable length (8-128 characters). The system SHALL allow users to include or exclude uppercase letters, lowercase letters, digits, and special characters.

#### Scenario: Generate default password

- **WHEN** user clicks "Generate" with default settings (length=16, all charsets enabled)
- **THEN** a 16-character password containing at least one uppercase, one lowercase, one digit, and one special character is displayed

#### Scenario: Digits only

- **WHEN** user unchecks all character sets except digits
- **THEN** the password contains only digits

### Requirement: Entropy display

The system SHALL compute and display the password's entropy in bits and show a strength indicator (Weak/Fair/Strong/Very Strong).

#### Scenario: 8-char alphanumeric password

- **WHEN** user generates an 8-character password with letters and digits only
- **THEN** the entropy is displayed as "~47 bits — Weak" and the indicator shows red

#### Scenario: 32-char full character set password

- **WHEN** user generates a 32-character password with all charsets enabled
- **THEN** the entropy is displayed as "~205 bits — Very Strong" and the indicator shows green

### Requirement: Copy to clipboard

The system SHALL copy the generated password to clipboard when the output area is clicked. The system SHALL show a "Copied!" confirmation message.

#### Scenario: Copy password

- **WHEN** user clicks on the generated password
- **THEN** the password is copied to clipboard and "Copied!" toast appears
