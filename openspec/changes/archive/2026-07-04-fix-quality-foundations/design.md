## Context

ztools 是一个 14 工具 Tauri v2 桌面应用，Vue 3 + TypeScript 前端，Rust 后端。近期快速迭代积累了工程质量债：构建阻塞（`vue-tsc --noEmit` 11 错误）、测试失败（12 用例）、Rust 关键路径零测试、无自动化检查、错误信息不可读。

约束：Tauri 桌面应用（WebView2），hash 路由，Element Plus auto-import，vue-i18n 双语。

## Goals / Non-Goals

**Goals:**
- `npm run build` 通过（`vue-tsc --noEmit && vite build`）
- `npm run test:run` 28 文件全部通过
- Rust `cargo test` 覆盖 downloader + hash_file 关键路径
- 每次 push/PR 自动验证格式、类型安全、测试、构建
- Tauri 错误可本地化（不再显示原始 Rust 字符串或泛化"无效输入"）
- `handleCopy` 不再在 14 个文件中重复

**Non-Goals:**
- 不添加 ESLint（tsconfig strict 已覆盖大部分价值）
- 不修改 M3U8 下载器的业务逻辑
- 不添加 E2E 测试（Playwright）
- 不修改 Tauri 窗口能力配置
- 不做 Rust 异步下载编排的单元测试（需 mock 网络层）

## Decisions

### D1: vitest 集成 auto-import 插件而非修复 stub

**选择**：在 `vitest.config.ts` 添加 `AutoImport(ElementPlusResolver)` + `Components(ElementPlusResolver)`，测试中挂载真实 Element Plus 组件。

**替代方案**：逐文件修复 stub（添加缺失的 `el-alert`，修正 `el-input` props 转发）。拒绝理由：stub 永远不等于真实组件，每新增组件依赖都需要更新所有测试文件。

**影响**：测试性能略降（jsdom 实例化真实组件），但 239 个测试当前 4 秒，预计增长到 6-8 秒，可接受。

### D2: `ElMessage` mock 使用 passthrough 模式

**选择**：`vi.mock('element-plus', async () => { const actual = await vi.importActual(...); return { ...actual, ElMessage: vi.fn() } })`，保留 element-plus 其他导出（组件注册需要），仅替换 `ElMessage`。

**替代方案**：完全替换 element-plus 模块。拒绝理由：auto-import 后 `el-button` 等来自真实包，完全 mock 会破坏组件渲染。

### D3: `useClipboard` 而非通用 `useToolAction`

**选择**：仅提取 `handleCopy`（14 个文件中完全一致），不提取 try/catch/isProcessing 骨架（每个工具的错误处理不同）。

**理由**：try/catch 结构虽然相同，但 catch 分支有 5+ 种变体（CryptoError 判断、i18n 参数、lastSucceeded 状态）。强行统一会导致配置复杂度超过原始代码。

### D4: Prettier 而跳过 ESLint

**选择**：仅添加 Prettier 格式化。`tsconfig.json` 的 `strict: true` + `noUnusedLocals` + `noUnusedParameters` 已覆盖 ESLint 最有价值的 60%。

**替代方案**：完整 ESLint 配置。拒绝理由：需要 10+ 插件、30+ 规则讨论、2-4 小时配置时间，当前单人或小团队不值得。

### D5: `TauriError` 简单类而非完整错误体系

**选择**：一个 `TauriError` 类携带 `code: string` 和 `message: string`。util 层根据错误字符串映射 code，前端直接用 `e.message` 展示。

**替代方案**：完整错误码枚举 + 类型守卫。拒绝理由：YAGNI。当前 4 类 Tauri 错误，映射表足以覆盖。枚举可以在错误类型超过 10 种之后引入。

### D6: Rust 测试优先纯函数

**选择**：测试 `resolve_url`（URL 拼接，6 用例）、`build_header_map`（Header 构建，3 用例）、`hash_file`（文件哈希，3 用例），不测试异步下载编排和 FFmpeg 调用。

**理由**：纯函数测试 10 分钟内完成，覆盖了最容易出错的部分。异步编排需要 mock 网络层，converter 依赖外部 FFmpeg 进程，ROI 低。

### D7: GitHub Actions 两阶段检查

**选择**：Node job（format-check → vue-tsc → vitest → vite build）和 Rust job（cargo check → cargo test）并行。格式化检查失败显示警告但不阻塞；类型/测试失败阻塞合并。

**理由**：格式化不应阻止紧急修复合并，但应让开发者知道。

## Risks / Trade-offs

- **[auto-import in vitest] 测试环境差异**：jsdom 与实际 WebView 行为略有不同（如 CSS 变量、Web Crypto），但 Element Plus 组件渲染逻辑不受影响。→ 缓解：关键交互测试已覆盖，视觉效果由人工验证。

- **[Prettier 首次格式化] 大规模 diff**：全项目格式化产生一个大量改动的 commit，可能掩盖后续 `git blame`。→ 缓解：单独提交，commit message 明确标注 `format: Prettier initialization`，配置 `.git-blame-ignore-revs`。

- **[TauriError 字符串匹配] Rust 错误信息不稳定**：如果 Rust 端用 `format!("...")` 改了措辞，前端映射可能失效。→ 缓解：`TauriError` code fallback 到 `'UNKNOWN'`，展示原始消息。

- **[移除 stubs 后测试可能暴露真实 bug]**：所有 28 个测试文件改用真实组件后，可能触发之前 stubs 掩盖的渲染问题。→ 缓解：逐一验证，预期几分钟内可修复。
