## 1. Dead Code Cleanup

- [x] 1.1 Remove `@playwright/test` from `package.json` dependencies (`npm r @playwright/test`)

## 2. Fix Build (vue-tsc Type Errors)

- [x] 2.1 Remove unused `const props =` binding in `CodeOutput.vue` (line 8)
- [x] 2.2 Remove unused `const props =` binding in `TitleBar.vue` (line 6)
- [x] 2.3 Remove unused `const props =` binding in `ToolPanel.vue` (line 9)
- [x] 2.4 Remove unused `Monitor` import in `GlobalToolbar.vue` (line 3)
- [x] 2.5 Remove unused `vi` import in `ToolPanel.spec.ts`
- [x] 2.6 Remove unused `M3u8Task` import in `m3u8.test.ts`
- [x] 2.7 Fix `@keydown` type mismatch in `Sidebar.vue`
- [x] 2.8 Bump `lib` in `tsconfig.json` from `ES2020` to `ES2022`
- [x] 2.9 Fix `.value` → `(element as HTMLInputElement).value` in `ColorConverter.test.ts`
- [x] 2.10 Fix `.value` in `RegexTester.test.ts`
- [x] 2.11 Fix `.value` in `TimestampConverter.test.ts`
- [x] 2.12 Verify `npm run build` passes ✓

## 3. Fix Test Infrastructure

- [x] 3.1 Add `AutoImport(ElementPlusResolver)` and `Components(ElementPlusResolver({ importStyle: false }), dts: false)` to `vitest.config.ts`
- [x] 3.2 Create `src/test-setup.ts` with global `ElMessage` mock (passthrough pattern)
- [x] 3.3 Update `vitest.config.ts` to reference `setupFiles: ['./src/test-setup.ts']`
- [x] 3.4-3.9 Remove all `stubs` and `vi.mock('element-plus', ...)` from all 28 test files
- [x] 3.10 Replace inline i18n messages with `import enUS from '@/i18n/en-US'` in all test files
- [x] 3.11 Verify `npm run test:run` passes 29 files with 0 failures ✓

## 4. Add Rust Tests

- [x] 4.1 Add `resolve_url` tests in `downloader.rs` (6 tests)
- [x] 4.2 Add `build_header_map` tests in `downloader.rs` (2 tests)
- [x] 4.3 Add `hash_file` tests in `lib.rs` (3 tests)
- [x] 4.4 Add edge case tests in `decrypt.rs` (2 tests)
- [x] 4.5 Verify `cargo test --lib` passes (26/26) ✓

## 5. Code Formatting

- [x] 5.1 Install Prettier: `npm i -D prettier` ✓
- [x] 5.2 Create `.prettierrc.json` with `semi: false, singleQuote: true, trailingComma: "all", printWidth: 100` ✓
- [x] 5.3 Add `format` and `format:check` scripts to `package.json` ✓
- [x] 5.4 Run `npm run format` to format entire project ✓
- [x] 5.5 Commit formatted code ✓ (af96103)
- [x] 5.6 Configure `.git-blame-ignore-revs` ✓ (28b5950)

## 6. CI Pipeline

- [x] 6.1 Create `.github/workflows/ci.yml` with Node job: format-check → vue-tsc → vitest → vite build ✓
- [x] 6.2 Add parallel Rust job to CI: `cargo check` + `cargo test --lib` ✓
- [ ] 6.3 Configure branch protection rules (manual — GitHub repo settings, not code)

## 7. Error Handling

- [x] 7.1 Create `src/utils/errors.ts` with `TauriError` class (message + code) ✓
- [x] 7.2 Wrap `hashFile` in `src/utils/hash.ts` with TauriError mapping ✓
- [x] 7.3 Wrap M3U8 `invoke*` functions in `src/utils/m3u8.ts` with TauriError mapping ✓
- [x] 7.4 Update `src/utils/window.ts` to throw instead of `console.error` ✓
- [x] 7.5 Add error code translations to `src/i18n/zh-CN.ts` and `src/i18n/en-US.ts` ✓
- [x] 7.6-7.7 Catch blocks in tools already pass `e.message` which flows from TauriError ✓

## 8. Shared Composables

- [x] 8.1 Create `src/composables/useClipboard.ts` ✓
- [x] 8.2-8.14 Replace `handleCopy` in all 12 tool Vue files with `useClipboard(output)` ✓
- [x] 8.15 Create `src/composables/__tests__/useClipboard.test.ts` ✓
- [x] 8.16 `copyToClipboard` imports cleaned up by fixer ✓
- [ ] 8.17 Verify tools still copy correctly (manual — `npm run tauri dev` smoke test)

## 9. Final Verification

- [x] 9.1 Run `npm run format:check` — passes ✓
- [x] 9.2 Run `npm run build` — passes ✓
- [x] 9.3 Run `npm run test:run` — 29/29 files, 241/241 tests pass ✓
- [x] 9.4 Run `cargo test --lib` — 26/26 tests pass ✓
- [ ] 9.5 Verify `npm run tauri dev` launches without errors (manual — requires Tauri environment)
