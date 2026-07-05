## ADDED Requirements

### Requirement: ESLint enforces code quality
The project SHALL have an `eslint.config.mjs` configuration using the flat config format with `eslint-plugin-vue` and `@typescript-eslint` plugins. ESLint SHALL run as a required check in CI.

#### Scenario: Unused variable in Vue SFC
- **WHEN** a Vue Single File Component contains an unused reactive variable
- **THEN** ESLint reports a warning or error depending on rule severity

#### Scenario: Missing key in v-for
- **WHEN** a template uses `v-for` without a `:key` binding
- **THEN** `vue/require-v-for-key` rule reports an error

#### Scenario: Unsafe v-html usage
- **WHEN** a template uses `v-html` without explicit sanitization
- **THEN** `vue/no-v-html` rule reports a warning

### Requirement: ESLint runs in CI as a blocking check
The ESLint check SHALL be a required step in the frontend CI job and SHALL block pull request merging on failure.

#### Scenario: ESLint failure in PR
- **WHEN** a pull request introduces an ESLint error
- **THEN** the CI job fails and merge is blocked

### Requirement: npm lint scripts are available
The project SHALL have `lint` and `lint:fix` npm scripts for running ESLint locally.

#### Scenario: Running lint script
- **WHEN** `npm run lint` is executed
- **THEN** ESLint checks all TypeScript and Vue files under `src/` without auto-fixing
