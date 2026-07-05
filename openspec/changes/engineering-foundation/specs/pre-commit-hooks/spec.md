## ADDED Requirements

### Requirement: Pre-commit hooks enforce quality before commit
The project SHALL use lefthook to run formatting and linting checks before each commit. Hooks SHALL be installed automatically via a `postinstall` script.

#### Scenario: Frontend formatting on commit
- **WHEN** a developer commits changes to `.ts`, `.vue`, or `.css` files
- **THEN** lefthook runs `prettier --write` on staged files before the commit proceeds

#### Scenario: ESLint on commit
- **WHEN** a developer commits changes to frontend files
- **THEN** lefthook runs `eslint --fix` on staged files before the commit proceeds

#### Scenario: Rust formatting on commit
- **WHEN** a developer commits changes to `.rs` files
- **THEN** lefthook runs `cargo fmt` on staged files before the commit proceeds

#### Scenario: Clippy on commit
- **WHEN** a developer commits changes to `.rs` files
- **THEN** lefthook runs `cargo clippy -- -D warnings` and blocks the commit if warnings exist

### Requirement: Hooks are installable via npm
The project SHALL have a `postinstall` npm script that runs `lefthook install` so hooks are set up automatically after `npm install`.

#### Scenario: Fresh clone setup
- **WHEN** a developer clones the repository and runs `npm install`
- **THEN** lefthook git hooks are installed automatically via the `postinstall` script
