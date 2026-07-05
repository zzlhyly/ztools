# AGENTS.md — ztools

Tauri v2 desktop toolbox app. Vue 3 + TypeScript frontend, Rust backend.

## Commands

```bash
npm run tauri dev     # dev with Tauri window (not `npm run dev` — Vite-only, no Rust)
npm run tauri build   # production build (runs vue-tsc → vite build first)
npm run test          # vitest watch mode
npm run test:run      # vitest single run
npm run test:coverage # vitest with coverage (thresholds: 80% lines, 80% branches)
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run format        # Prettier format
npm run format:check  # Prettier check only
npx vitest path/to/file   # run one test file
```

## Rust logging

Set `RUST_LOG` env var to control log level:

```bash
RUST_LOG=debug npm run tauri dev     # verbose logs
RUST_LOG=info,ztools_lib::m3u8=debug npm run tauri dev  # debug for m3u8 only
```

Default level is `warn` (errors and warnings only).

## Architecture

- **Frontend**: `src/` — Vue 3 SFC with `<script setup lang="ts">`, Pinia stores, vue-i18n (zh-CN/en-US), vue-router (hash mode)
- **Backend**: `src-tauri/src/lib.rs` — Tauri commands: `hash_file`, M3U8 downloader, HTTP fetch
- **Entry**: `src/main.ts` → App.vue → TitleBar / GlobalToolbar / Sidebar / `<router-view>`
- **Routing**: `src/router/index.ts` — hash-based, one route per tool
- **State**: `src/stores/app.ts` — theme, locale, sidebar, recentTools (persisted to localStorage)
- **Styles**: CSS custom properties in `src/styles/variables.css`, light/dark via `html.dark`, Element Plus dark via `element-plus/theme-chalk/dark/css-vars.css`
- **Path alias**: `@/` → `src/`

## Adding a tool

Must touch these files, in this order:

1. `src/tools/NewTool.vue` — use `<ToolLayout>`, `<ToolTextarea>`, `<CodeOutput>`, `<ToolActionBar>` slots
2. `src/router/index.ts` — add route with lazy import
3. `src/components/Sidebar.vue` — add `{ path, icon, key }` to `tools` array, import icon from lucide-vue-next
4. `src/i18n/zh-CN.ts` and `src/i18n/en-US.ts` — add `tools.xxx: { name, description }`
5. Utility logic in `src/utils/` (optional)

## Element Plus / Vue conventions

- Element Plus components are **auto-imported** (unplugin-vue-components + unplugin-auto-import) — no manual imports needed
- Generated files: `src/components.d.ts`, `src/auto-imports.d.ts` — never edit manually
- `ElMessage` must be imported explicitly: `import { ElMessage } from 'element-plus'`
- Use `<el-button>` with `:icon` prop (lucide-vue-next icons as components)
- Shared components: `ToolLayout`, `ToolPanel`, `ToolTextarea`, `CodeOutput`, `ToolActionBar`

## Rust / Tauri

- Rust edition 2021, crate name `ztools_lib` (lib), `ztools` (binary)
- Tauri commands defined in `src-tauri/src/lib.rs` with `#[tauri::command]`
- Capabilities in `src-tauri/capabilities/default.json`
- Rerun `npm run tauri dev` after Rust changes

## Testing

- Vitest + jsdom, `globals: true`
- Test files: `src/**/__tests__/*.{test,spec}.{js,ts}`
- Test files are co-located with source (e.g. `src/utils/__tests__/hash.test.ts`)
- Coverage: v8 provider, output as text/json/html
- Element Plus stubs needed for component tests that render el-* components

## TypeScript

- Strict mode, `noUnusedLocals`, `noUnusedParameters`
- IDE: `vue-tsc` for type checking at build time (`npm run build` = `vue-tsc --noEmit && vite build`)
- Vite config uses `@ts-expect-error` for `process.env.TAURI_DEV_HOST`

## Gotchas

- **Don't use `npm run dev` alone** — it starts Vite without Tauri, no Rust backend
- **Vite port 1420 is strict** — won't fall back to another port
- **Hash routing** — all URLs use `/#/toolname`, not `/toolname`
- **Tauri window has no native decorations** (`decorations: false`) — TitleBar.vue handles dragging/minimize/maximize/close
- **CSP is null** in tauri.conf.json — allows all content

## Pre-Push Validation Checklist

Before pushing any commit, run this local CI simulation. A single command alias `npm run ci:check` is planned (not yet implemented).

```bash
# Frontend
npx vue-tsc --noEmit
npm run lint
npm run test:run
npx prettier --check "src/**/*.{ts,vue,css}"

# Rust
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo test --lib --manifest-path src-tauri/Cargo.toml
```

**Never push without at least `vue-tsc --noEmit` passing.**
TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) will fail CI if any import or variable is declared but unused.
`npm run lint` on its own does NOT catch TS6133 — only `vue-tsc` does.

## Parallel Fixer Dispatch Rules

When dispatching multiple fixers in parallel for tool implementation:

1. **File ownership must be exclusive.** Each fixer gets a whitelist of files they MAY modify. Shared files (router, sidebar, i18n) MUST NOT be touched by fixers — the orchestrator handles integration after all fixers return.

2. **Fixer prompt template must include:**
   - Explicit "You MAY modify these files:" whitelist
   - Explicit "You MUST NOT touch these files:" blacklist (at minimum: `router/index.ts`, `Sidebar.vue`, `i18n/*.ts`, `Cargo.toml`, `lib.rs`)
   - Mandatory verification step: `npm run test:run` AND `npx vue-tsc --noEmit` before reporting done

3. **Integration is a separate phase.** After all fixers return, the orchestrator:
   - Reads all created files for consistency
   - Adds routes to `router/index.ts`
   - Adds entries to `Sidebar.vue` (with correct lucide icon imports)
   - Adds i18n keys to `zh-CN.ts` and `en-US.ts`
   - Runs full validation: `vue-tsc && lint && test:run && prettier --check`
   - Updates README.md and README_zh-CN.md

4. **Never dispatch fixers when user requires TDD.** TDD implies orchestrator owns the implementation loop: write failing test → implement → see green → commit → next task. Parallel fixers cannot maintain this discipline.

## Component Testing Baseline

Every new tool MUST have at least one component smoke test that:

- Mounts the component with required plugins (router, i18n, pinia)
- Asserts at least one key element exists (textarea, button, etc.)

Pure logic functions MUST be extracted to `src/utils/` and unit-tested there.
Do NOT keep business logic inline in Vue `<script setup>` — extract to utils and test independently.

## ESM Import Gotcha

Some npm packages (notably `js-yaml`) do NOT provide a default ESM export.
Incorrect: `import yaml from 'js-yaml'` → fails silently at runtime
Correct: `import * as yaml from 'js-yaml'`

When adding a new npm dependency, verify its ESM export shape:

```bash
node --input-type=module -e "import pkg from '<package>'; console.log(typeof pkg)"
```
