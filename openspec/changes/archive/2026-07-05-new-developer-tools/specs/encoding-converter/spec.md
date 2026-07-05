## ADDED Requirements

### Requirement: File encoding detection

The system SHALL detect the character encoding of a text file and display the detected encoding with a confidence score. Supported encodings SHALL include UTF-8, UTF-16, GBK, GB2312, Shift-JIS, EUC-JP, EUC-KR, Big5, ISO-8859-1, and Windows-1252.

#### Scenario: Detect UTF-8 file

- **WHEN** user drops a UTF-8 encoded text file
- **THEN** the system displays "Detected: UTF-8 (100% confidence)"

#### Scenario: Detect GBK file

- **WHEN** user drops a GBK-encoded Chinese text file
- **THEN** the system displays "Detected: GBK (95% confidence)"

### Requirement: Encoding conversion

The system SHALL convert text files between detected/source encoding and target encoding with UTF-8 as the default target. The system SHALL produce a downloadable output file.

#### Scenario: Convert GBK to UTF-8

- **WHEN** user drops a GBK file and selects target encoding "UTF-8"
- **THEN** the system converts and provides a download button for the UTF-8 version

### Requirement: Rust backend command

The system SHALL implement encoding detection and conversion as a Tauri command `convert_encoding` using the `encoding_rs` crate.

#### Scenario: Backend encoding detection

- **WHEN** frontend calls `invoke('detect_encoding', { path: '/path/to/file.txt' })`
- **THEN** the backend returns `{ encoding: 'gbk', confidence: 0.95 }`

### Requirement: Drag-and-drop input

The system SHALL support drag-and-drop of text files onto the input area. The system SHALL display a preview of the first 500 characters when the file is small enough.

#### Scenario: Drop a text file

- **WHEN** user drops a 2KB text file
- **THEN** the tool displays the detected encoding, a file preview, and conversion options
