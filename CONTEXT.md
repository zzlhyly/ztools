# CONTEXT.md — ztools 项目背景

## 项目概述

ztools 是一个面向开发者的桌面工具箱应用，提供常用开发工具（JSON/XML 格式化、Base64 编解码、哈希计算等）。基于 Tauri v2（Rust）+ Vue 3（TypeScript）+ Element Plus 构建，支持 Windows/macOS/Linux。

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
| 测试 | Vitest + jsdom |
| 类型检查 | vue-tsc (TypeScript strict) |

## 目录结构

```
ztools/
├── src/                       # Vue 前端
│   ├── main.ts                # 入口
│   ├── App.vue                # 根组件
│   ├── components/            # 共享组件 (ToolLayout, ToolTextarea, CodeOutput 等)
│   ├── tools/                 # 工具页面 (每种工具一个 .vue)
│   ├── router/index.ts        # Hash 路由
│   ├── stores/app.ts          # Pinia store (主题/语言/侧栏/最近使用)
│   ├── i18n/                  # 国际化 (zh-CN.ts, en-US.ts)
│   ├── utils/                 # 工具函数 (clipboard, hash, formatters, window)
│   └── styles/                # CSS 变量和全局样式
├── src-tauri/                 # Tauri 后端 (Rust)
│   ├── src/lib.rs             # Tauri 命令
│   ├── capabilities/          # 权限配置
│   └── tauri.conf.json        # Tauri 配置
├── docs/                      # 项目文档
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
通过 unplugin-vue-components + unplugin-auto-import 实现，无需手动 import。`ElMessage` 是唯一需要显式导入的。

### 共享组件模式
所有工具页面使用相同的共享组件（ToolLayout → ToolPanel → ToolTextarea / CodeOutput + ToolActionBar），保证 UI 一致性。

### 工具添加清单
添加新工具需修改 4-5 个文件：Tool.vue → router → i18n (x2) → Sidebar，详见 AGENTS.md。

## 约束

- **端口**：Vite 开发服务器固定 1420 端口 (`strictPort: true`)
- **TypeScript**：严格模式，`noUnusedLocals`/`noUnusedParameters` 开启
- **构建**：`npm run tauri build` 会自动先运行 `vue-tsc --noEmit` 做类型检查
- **CSP**：null（允许所有内容）
- **不能单独 `npm run dev`**：只启动 Vite，没有 Rust 后端

## 已知问题 / 待优化

- LSP 报错 `vite.config.ts`/`vitest.config.ts` 缺少 `@types/node`（不影响实际构建）
- Rust 后端目前仅有一个 greeting 命令，大部分功能纯前端实现
- 无 CI/CD 配置
