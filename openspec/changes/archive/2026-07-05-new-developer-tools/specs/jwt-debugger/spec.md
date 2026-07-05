## ADDED Requirements

### Requirement: JWT Token Decoding

The system SHALL decode JWT tokens and display the Header and Payload as formatted JSON. The system SHALL support both JWS (signed) and JWE (encrypted) token formats, displaying base64url-decoded sections where the payload is not encrypted.

#### Scenario: Decode a valid JWS token

- **WHEN** user pastes a valid JWS token `eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature`
- **THEN** Header is displayed as `{ "alg": "RS256" }` and Payload is displayed as `{ "sub": "123" }`

#### Scenario: Handle expired token

- **WHEN** user pastes a JWT with `"exp": 946684800` (year 2000)
- **THEN** a warning badge "Expired: 2000-01-01" is displayed next to the payload

#### Scenario: Handle invalid input

- **WHEN** user enters text that is not a valid JWT (fewer than 2 dots)
- **THEN** an error message "Invalid JWT format" is displayed in the output panel

### Requirement: Copy individual claims

The system SHALL provide a copy button next to each JWT section (Header, Payload, Signature) to copy that section's decoded text independently.

#### Scenario: Copy payload JSON

- **WHEN** user clicks "Copy" button next to the Payload section
- **THEN** the decoded payload JSON is copied to clipboard

### Requirement: JWT signature status display

The system SHALL provide an optional public key input (PEM or JWK format) for signature verification. When a valid key is provided, the system SHALL attempt to verify the JWT signature using Web Crypto. The system SHALL indicate the signature status: "Verified" (key provided and signature matches), "Not Verified" (no key provided), or "Invalid" (key provided but signature mismatch or algorithm unsupported).

#### Scenario: Signature status without key

- **WHEN** user decodes a JWT without providing a public key
- **THEN** signature status shows "Not Verified — no public key provided"

#### Scenario: Successful verification

- **WHEN** user pastes a valid RS256-signed JWT and a matching RSA public key in PEM format
- **THEN** signature status shows "Verified ✓" in green

#### Scenario: Mismatched key

- **WHEN** user pastes a JWT with a wrong public key and clicks "Verify"
- **THEN** signature status shows "Invalid ✗ — key does not match" in red
