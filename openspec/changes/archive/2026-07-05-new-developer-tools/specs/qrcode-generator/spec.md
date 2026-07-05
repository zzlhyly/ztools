## ADDED Requirements

### Requirement: QR code generation from text

The system SHALL generate QR codes from text or URL input and display them as inline SVG. The system SHALL support configurable size (128-1024px) and foreground/background colors.

#### Scenario: Generate QR from URL

- **WHEN** user enters `https://github.com` and clicks "Generate"
- **THEN** a scannable QR code SVG is displayed with default size 256px

#### Scenario: Customize size

- **WHEN** user changes size slider to 512px
- **THEN** the displayed QR code updates to 512×512 pixels without re-rendering the whole page

#### Scenario: Customize colors

- **WHEN** user selects foreground color "#1a1a2e" and background "#e94560"
- **THEN** the QR code renders with the specified colors

### Requirement: QR code download

The system SHALL provide a download button to export the generated QR code as SVG or PNG format.

#### Scenario: Download as SVG

- **WHEN** user clicks "Download SVG"
- **THEN** the QR code is downloaded as an `.svg` file

### Requirement: Empty input handling

The system SHALL disable the generate button when the input is empty and show a placeholder state.

#### Scenario: Empty input

- **WHEN** the text input is empty
- **THEN** the generate button is disabled and the output area shows "Enter text or URL to generate QR code"
