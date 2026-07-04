## Why

项目在快速添加了 14 个工具后，工程基础设施严重滞后：构建阻塞（11 个 `vue-tsc` 类型错误）、测试失败（5 文件 12 用例）、Rust 后端关键路径零测试、无格式化工具、无 CI 流水线。每次代码变更都在无人知晓地累积回归风险。现在是产品功能暂停期，是修复基础设施的最佳窗口。

## What Changes

- **修复构建**：清除 11 个 `vue-tsc` 类型错误，恢复 `npm run build` 通过
- **修复测试**：在 vitest 中集成 auto-import 插件，消除手动 stub 维护，修复 12 个失败用例
- **添加 Rust 测试**：为 `downloader.rs` 的 `resolve_url`/`build_header_map` 和 `lib.rs` 的 `hash_file` 补充单元测试
- **添加代码格式化**：Prettier 全项目格式化，消除格式不一致
- **添加 CI 流水线**：GitHub Actions 自动运行 format-check → type-check → test → build（含 Rust `cargo check` + `cargo test`）
- **移除死代码**：删除 `@playwright/test`（未使用的依赖）和未使用的代码
- **加固错误处理**：创建 `TauriError` 类，util 层统一包装 Tauri 错误为可本地化消息
- **提取共享模式**：创建 `useClipboard` composable，消除 14 个工具中的 `handleCopy` 重复
- **前端测试加固**：统一使用真实 i18n locale 文件，消除测试中内联 i18n 消息的维护负担

## Capabilities

### New Capabilities

- `ci-pipeline`: 每次 push/PR 自动运行格式化检查、类型检查、前端测试、Vite 构建、Rust 编译检查、Rust 测试。格式化检查失败显示警告但不阻塞合并；类型检查和测试失败阻塞合并。
- `error-localization`: Tauri 命令调用失败时返回可本地化的错误码（`FILE_NOT_FOUND`、`PERMISSION_DENIED` 等），前端直接展示对应语言的错误提示，不再显示原始 Rust 错误字符串或泛化的"无效输入"。
- `shared-composables`: `useClipboard` composable 统一处理复制到剪贴板逻辑，`TauriError` 类统一 Tauri 命令错误包装。

## Impact

- `package.json`: 移除 `@playwright/test` 从 `dependencies`；添加 `prettier` 到 `devDependencies`；添加 `format`/`format:check` scripts
- `tsconfig.json`: `lib` 从 `ES2020` 升级到 `ES2022`
- `vitest.config.ts`: 添加 `AutoImport` + `Components` 插件（ElementPlusResolver）
- 新建文件: `src/test-setup.ts`、`src/composables/useClipboard.ts`、`src/utils/errors.ts`、`.prettierrc.json`、`.github/workflows/ci.yml`
- 受影响的 Vue SFC: 所有 14 个工具组件 + 4 个共享组件（CodeOutput、TitleBar、ToolPanel、GlobalToolbar、Sidebar）
- 受影响的 Rust 源文件: `lib.rs`、`downloader.rs`、`decrypt.rs`
- 受影响的测试文件: 全部 28 个测试文件（删除 stubs 和 vi.mock 调用，统一 i18n 来源）
- 受影响的 i18n 文件: `zh-CN.ts`、`en-US.ts`（添加错误码翻译）
- 全项目 Prettier 格式化（一次性格式化提交）
