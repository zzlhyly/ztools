# CONTEXT.md — ztools 项目背景

## 项目概述

ztools 是一个面向开发者的桌面工具箱应用，提供 14 种开发工具（JSON/XML 格式化、Base64/URL 编解码、哈希计算、AES/RSA 加解密、HMAC、UUID 生成等）。基于 Tauri v2（Rust）+ Vue 3（TypeScript）+ Element Plus 构建，支持 Windows/macOS/Linux。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Tauri v2 |
| 后端语言 | Rust (edition 2021) |
| 前端框架 | Vue 3 (Composition API, `<script setup>`) |
| 构建工具 | Vite 6 |
| UI 组件库 | Element Plus 2 |
| 状态管理 | Pinia |
| 国际化 | vue-i18n (zh-CN / en-US) |
| 图标 | lucide-vue-next |
| 测试 | Vitest + jsdom + Rust 单元测试 |
| 类型检查 | vue-tsc (TypeScript strict) |
| 格式化 | Prettier |
| CI/CD | GitHub Actions |

## 目录结构

```
ztools/
├── src/                       # Vue 前端
│   ├── main.ts                # 入口
│   ├── App.vue                # 根组件
│   ├── components/            # 共享组件 (ToolLayout, ToolTextarea, CodeOutput 等)
│   ├── composables/           # 共享 composable
│   │   └── useClipboard.ts    # 剪贴板复制
│   ├── tools/                 # 工具页面 (每种工具一个 .vue)
│   ├── router/index.ts        # Hash 路由
│   ├── stores/app.ts          # Pinia store (主题/语言/侧栏/最近使用)
│   ├── i18n/                  # 国际化 (zh-CN.ts, en-US.ts)
│   ├── utils/                 # 工具函数 (clipboard, hash, crypto, formatters, errors, window)
│   ├── styles/                # CSS 变量和全局样式
│   └── test-setup.ts          # 全局测试 Mock (Element Plus 组件 + ElMessage)
├── .github/workflows/ci.yml   # CI 流水线
├── src-tauri/                 # Tauri 后端 (Rust)
│   ├── src/lib.rs             # Tauri 命令
│   ├── src/m3u8/              # M3U8 模块 (playlist, decrypt, downloader, converter)
│   ├── capabilities/          # 权限配置
│   └── tauri.conf.json        # Tauri 配置
├── .prettierrc.json           # 代码格式化配置
├── .git-blame-ignore-revs     # git blame 忽略格式化提交
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.json
```

## 设计决策

### 无原生窗口装饰
窗口使用 `decorations: false`，由自定义 TitleBar 实现拖拽和控制按钮，保证跨平台一致的 UI。

### Hash 路由
使用 `createWebHashHistory`（`/#/toolname`），适应 Tauri 本地文件协议。

### Element Plus 自动导入
通过 unplugin-vue-components + unplugin-auto-import 实现，无需手动 import。`ElMessage` 是唯一需要显式导入的。测试环境同样配置了 auto-import 插件（`importStyle: false` 跳过 CSS），配合全局 `test-setup.ts` mock `ElMessage`。

### 共享组件模式
所有工具页面使用相同的共享组件（ToolLayout → ToolPanel → ToolTextarea / CodeOutput + ToolActionBar），保证 UI 一致性。`handleCopy` 已提取为 `useClipboard` composable 消除重复。

### 错误处理
Tauri 命令调用通过 `TauriError` 类统一包装，携带机器可读的错误码（如 `FILE_NOT_FOUND`、`NETWORK_ERROR`），i18n 文件中维护中英文翻译。前端工具直接展示 `e.message`。

### 工具添加清单
添加新工具需修改 4-5 个文件：Tool.vue → router → i18n (x2) → Sidebar，详见 AGENTS.md。

## 约束

- **端口**：Vite 开发服务器固定 1420 端口 (`strictPort: true`)
- **TypeScript**：严格模式，`noUnusedLocals`/`noUnusedParameters` 开启
- **构建**：`npm run tauri build` 会自动先运行 `vue-tsc --noEmit` 做类型检查
- **CSP**：null（允许所有内容）
- **不能单独 `npm run dev`**：只启动 Vite，没有 Rust 后端
- **加密操作**：所有加解密使用 Web Crypto API（浏览器沙箱），密钥不离开前端。文件哈希使用 Rust 后端（ring crate + SHA-NI 硬件加速）

## CI/CD

每次 push 到 `main` 或提交 PR 自动运行：

- **前端 job**：`format-check`（非阻塞） → `vue-tsc --noEmit` → `vitest run` → `vite build`
- **Rust job**（并行）：`cargo check` → `cargo test --lib`

格式检查失败不阻塞合并；类型检查和测试失败阻塞合并。

## 测试覆盖

- **前端**：29 个测试文件，241 个测试用例，覆盖所有 14 个工具 + 共享组件 + stores + 路由 + i18n + 工具函数 + composable
- **后端**：26 个 Rust 单元测试，覆盖 M3U8 解析（playlist.rs: 7）、AES 解密（decrypt.rs: 8）、下载器 URL 拼接/Header 构建（downloader.rs: 8）、文件哈希（lib.rs: 3）
