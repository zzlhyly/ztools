# CI Pipeline

## Purpose

Every push to `main` and every pull request targeting `main` automatically runs format checks, type checks, frontend tests, Vite build, Rust compilation checks, and Rust tests. Format check failures are non-blocking warnings; type check and test failures block merging.

## Requirements

### Requirement: CI automatically runs on push and PR
The system SHALL automatically run quality checks on every push to `main` and every pull request targeting `main` via GitHub Actions.

#### Scenario: Push to main triggers full check
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the CI workflow runs format-check, type-check, test, and vite-build for the frontend, and cargo-check and cargo-test for the backend

#### Scenario: PR triggers full check
- **WHEN** a pull request is opened or updated targeting `main`
- **THEN** the same checks run and results are reported as PR status checks

### Requirement: Format check is non-blocking
The format check (`prettier --check`) SHALL run as part of CI but SHALL NOT block pull request merging.

#### Scenario: Format check fails
- **WHEN** code contains formatting violations not matching `.prettierrc.json` rules
- **THEN** the CI job shows a warning/failure badge but does not prevent merge

### Requirement: Type check and tests block merge
The type check (`vue-tsc --noEmit`) and test suite (`vitest run`) SHALL block pull request merging when they fail.

#### Scenario: Type error in PR
- **WHEN** a pull request introduces a `vue-tsc` type error
- **THEN** the PR status check shows failure and merge is blocked

#### Scenario: Test failure in PR
- **WHEN** a pull request introduces a test failure
- **THEN** the PR status check shows failure and merge is blocked

### Requirement: Rust checks run in parallel
Rust `cargo check` and `cargo test` SHALL run as a separate parallel CI job alongside the frontend checks.

#### Scenario: Rust compilation error
- **WHEN** a pull request introduces a Rust compilation error
- **THEN** the Rust CI job fails and reports the error independently from the frontend job

### Requirement: Prettier enforces consistent code style
The project SHALL have a `.prettierrc.json` configuration and `format` / `format:check` npm scripts for code formatting.

#### Scenario: Running format script
- **WHEN** `npm run format` is executed
- **THEN** all TypeScript, Vue, and CSS files under `src/` are formatted in-place according to `.prettierrc.json`
