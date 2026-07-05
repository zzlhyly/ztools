## ADDED Requirements

### Requirement: Ed25519 key pair generation

The system SHALL detect Ed25519 support via `crypto.subtle.generateKey` feature detection on mount. If unsupported, the system SHALL display a clear message "Ed25519 is not supported in this browser" with a link to upgrade. If supported, the system SHALL generate Ed25519 key pairs using the Web Crypto API and display both the public key and private key in JWK (JSON Web Key) format and PEM format.

#### Scenario: Unsupported browser

- **WHEN** the WebView does not support Ed25519 in SubtleCrypto
- **THEN** a message "Ed25519 is not supported in this browser version. Please upgrade your system." is displayed

#### Scenario: Generate key pair

- **WHEN** user clicks "Generate Key Pair"
- **THEN** the public key JWK is displayed in the public key panel and the private key JWK is displayed in the private key panel

#### Scenario: Copy public key

- **WHEN** user clicks "Copy" on the public key panel
- **THEN** the public key is copied to clipboard in the selected format (JWK or PEM)

### Requirement: Sign data with Ed25519

The system SHALL sign arbitrary text data using the generated Ed25519 private key and produce a base64-encoded signature.

#### Scenario: Sign a message

- **WHEN** user enters "Hello World" in the data input and clicks "Sign"
- **THEN** a base64-encoded signature is displayed in the signature output panel

### Requirement: Verify Ed25519 signature

The system SHALL verify Ed25519 signatures using the public key and indicate success or failure.

#### Scenario: Verify valid signature

- **WHEN** user enters the original data, public key, and valid signature, then clicks "Verify"
- **THEN** the system displays "Signature Valid ✓" in green

#### Scenario: Verify tampered signature

- **WHEN** user modifies one character of the signature and clicks "Verify"
- **THEN** the system displays "Signature Invalid ✗" in red

### Requirement: Key format toggle

The system SHALL provide a toggle to switch key display between JWK format (default) and PEM format with appropriate headers.

#### Scenario: Toggle to PEM format

- **WHEN** user clicks "Show as PEM"
- **THEN** both public and private keys are displayed in PEM format with `-----BEGIN PUBLIC KEY-----` headers
