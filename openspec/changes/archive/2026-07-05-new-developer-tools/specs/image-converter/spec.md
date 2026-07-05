## ADDED Requirements

### Requirement: Image format conversion

The system SHALL convert between PNG, JPEG, WebP, and AVIF image formats. The system SHALL preserve metadata where possible and report the input/output file sizes.

#### Scenario: Convert PNG to JPEG

- **WHEN** user selects a PNG file and chooses "JPEG" format with quality 80%
- **THEN** the system produces a JPEG file, displays the output file size, and provides a download button

#### Scenario: Convert JPEG to WebP

- **WHEN** user selects a JPEG file and chooses "WebP" format
- **THEN** the system produces a WebP file with the same dimensions

### Requirement: Image compression

The system SHALL support quality adjustment (1-100) for JPEG and WebP outputs. The system SHALL display a preview with estimated output size before conversion.

#### Scenario: Adjust JPEG quality

- **WHEN** user drags the quality slider to 50%
- **THEN** the estimated output size decreases and the preview updates (if supported)

### Requirement: Drag-and-drop input

The system SHALL support drag-and-drop of image files onto the input area. The system SHALL display the input file name, format, dimensions, and size upon drop.

#### Scenario: Drop a PNG file

- **WHEN** user drags a 1920x1080 PNG file onto the tool
- **THEN** the tool displays "input.png — 1920×1080 — PNG — 2.3 MB"

### Requirement: Rust backend command

The system SHALL implement image conversion as a Tauri command `convert_image` in Rust using the `image` crate. The command SHALL accept the input file path, output format, and quality parameter.

#### Scenario: Backend conversion

- **WHEN** frontend calls `invoke('convert_image', { path, format: 'webp', quality: 80 })`
- **THEN** the backend returns `{ output_path: '/tmp/...', original_size: 2300000, output_size: 450000 }`
