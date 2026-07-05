## MODIFIED Requirements

### Requirement: CI automatically runs on push and PR
The system SHALL automatically run quality checks on every push to `main` and every pull request targeting `main` via GitHub Actions.

#### Scenario: Push to main triggers full check
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the CI workflow runs ESLint, type-check, test with coverage, and vite-build for the frontend, and cargo-check, cargo-clippy, cargo-fmt, and cargo-test for the backend

#### Scenario: PR triggers full check
- **WHEN** a pull request is opened or updated targeting `main`
- **THEN** the same checks run and results are reported as PR status checks

### Requirement: Format check is non-blocking
The format check (`prettier --check`) SHALL run as part of CI and SHALL block pull request merging when it fails.

#### Scenario: Format check fails
- **WHEN** code contains formatting violations not matching `.prettierrc.json` rules
- **THEN** the CI job fails and merge is blocked

### Requirement: Type check and tests block merge
The type check (`vue-tsc --noEmit`), test suite (`vitest run`), and ESLint check SHALL block pull request merging when they fail.

#### Scenario: Type error in PR
- **WHEN** a pull request introduces a `vue-tsc` type error
- **THEN** the PR status check shows failure and merge is blocked

#### Scenario: Test failure in PR
- **WHEN** a pull request introduces a test failure
- **THEN** the PR status check shows failure and merge is blocked

#### Scenario: ESLint error in PR
- **WHEN** a pull request introduces an ESLint error
- **THEN** the PR status check shows failure and merge is blocked

### Requirement: Rust checks run in parallel
Rust `cargo check`, `cargo clippy`, `cargo fmt --check`, and `cargo test` SHALL run as a separate parallel CI job alongside the frontend checks.

#### Scenario: Rust compilation error
- **WHEN** a pull request introduces a Rust compilation error
- **THEN** the Rust CI job fails and reports the error independently from the frontend job

#### Scenario: Clippy warning
- **WHEN** `cargo clippy -- -D warnings` finds a lint violation
- **THEN** the Rust CI job fails and merge is blocked

#### Scenario: Rust formatting violation
- **WHEN** `cargo fmt --check` detects unformatted code
- **THEN** the Rust CI job fails and merge is blocked

### Requirement: Test coverage threshold enforced
The vitest test suite SHALL enforce a minimum coverage threshold of 80% lines and 80% branches.

#### Scenario: Coverage below threshold
- **WHEN** test coverage falls below 80% lines or 80% branches
- **THEN** the CI test job fails and merge is blocked

### Requirement: Prettier enforces consistent code style
The project SHALL have a `.prettierrc.json` configuration and `format` / `format:check` npm scripts for code formatting.

#### Scenario: Running format script
- **WHEN** `npm run format` is executed
- **THEN** all TypeScript, Vue, and CSS files under `src/` are formatted in-place according to `.prettierrc.json`

## ADDED Requirements

### Requirement: ESLint enforces code quality
The CI pipeline SHALL include an ESLint check (`npm run lint`) that validates TypeScript and Vue files against the project's `eslint.config.mjs` configuration.

#### Scenario: ESLint runs in CI
- **WHEN** the frontend CI job executes
- **THEN** `npm run lint` runs after format check and before type check

### Requirement: .editorconfig provided
The project SHALL include an `.editorconfig` file for consistent editor settings across contributors.
