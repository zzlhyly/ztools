# AGENTS.md — ztools

Tauri v2 desktop toolbox app. Vue 3 + TypeScript frontend, Rust backend.

## Commands

```bash
npm run tauri dev     # dev with Tauri window (not `npm run dev` — Vite-only, no Rust)
npm run tauri build   # production build (runs vue-tsc → vite build first)
npm run test          # vitest watch mode
npm run test:run      # vitest single run
npx vitest path/to/file   # run one test file
```

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
