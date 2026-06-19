# ztools 工具集设计文档 / ztools Toolkit Design Document

**日期 / Date:** 2026-06-19
**版本 / Version:** 2.0
**状态 / Status:** 评审通过 / Review Passed

---

## 1. 项目概述 / Project Overview

### 1.1 项目目标 / Project Goals

开发一个桌面工具集应用，集成常用开发工具，提高日常开发效率。

Develop a desktop toolkit application that integrates common development tools to improve daily development efficiency.

### 1.2 目标用户 / Target Users

- 软件开发人员 / Software developers
- 前端工程师 / Frontend engineers
- 全栈开发人员 / Full-stack developers

### 1.3 核心功能 / Core Features

| 工具 / Tool | 描述 / Description | 实现方式 / Implementation |
|-------------|-------------------|-------------------------|
| JSON 格式化 / JSON Formatter | JSON 数据格式化、压缩、验证 | 前端 / Frontend |
| XML 格式化 / XML Formatter | XML 数据格式化、压缩、验证 | 前端 / Frontend |
| Base64 编解码 / Base64 Encoder/Decoder | Base64 编码和解码（支持 UTF-8） | 前端 / Frontend |
| URL 编解码 / URL Encoder/Decoder | URL 编码和解码 | 前端 / Frontend |
| 时间戳转换 / Timestamp Converter | 时间戳与日期时间互转 | 前端 / Frontend |
| 正则表达式测试 / Regex Tester | 正则表达式测试和匹配 | 前端 / Frontend |
| 颜色转换 / Color Converter | HEX、RGB、HSL 颜色互转 | 前端 / Frontend |
| 哈希计算 / Hash Calculator | SHA1、SHA256、SHA384、SHA512 哈希计算 | 前端 / Frontend (Web Crypto) |

---

## 2. 技术架构 / Technical Architecture

### 2.1 技术栈 / Tech Stack

| 层级 / Layer | 技术 / Technology | 版本 / Version |
|-------------|-------------------|----------------|
| 前端框架 / Frontend Framework | Vue 3 | ^3.5.13 |
| UI 框架 / UI Framework | Element Plus | ^2.9.0 |
| 路由 / Router | Vue Router | ^4.5.0 |
| 状态管理 / State Management | Pinia | ^2.3.0 |
| 国际化 / Internationalization | vue-i18n | ^9.14.0 |
| 图标 / Icons | lucide-vue-next | ^0.460.0 |
| 构建工具 / Build Tool | Vite | ^6.0.3 |
| 桌面框架 / Desktop Framework | Tauri | v2 |

### 2.2 架构模式 / Architecture Pattern

**纯前端架构 / Pure Frontend Architecture:**

所有工具逻辑在前端实现，Tauri 仅作为桌面容器。理由：
- Web Crypto API 性能足够，无需 Rust 后端
- 架构简洁，开发效率高
- 易于维护和扩展

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri Window                           │
├─────────────────────────────────────────────────────────────┤
│  TitleBar.vue (Custom Title Bar)                           │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Sidebar.vue │  Tool Content Area                           │
│              │  ┌────────────────────────────────────────┐  │
│  - JSON      │  │  ToolLayout.vue                        │  │
│  - XML       │  │  ┌──────────────┬───────────────────┐  │  │
│  - Base64    │  │  │  Input Area  │  Output Area      │  │  │
│  - URL       │  │  │              │                   │  │  │
│  - Timestamp │  │  │              │                   │  │  │
│  - Regex     │  │  └──────────────┴───────────────────┘  │  │
│  - Color     │  └────────────────────────────────────────┘  │
│  - Hash      │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### 2.3 目录结构 / Directory Structure

```
ztools/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── App.vue                    # 根组件
│   ├── components/                # 公共组件
│   │   ├── TitleBar.vue           # 自定义标题栏
│   │   ├── Sidebar.vue            # 侧边栏导航
│   │   └── ToolLayout.vue         # 工具页面布局
│   ├── tools/                     # 工具页面
│   │   ├── JsonFormatter.vue      # JSON 格式化
│   │   ├── XmlFormatter.vue       # XML 格式化
│   │   ├── Base64Tool.vue         # Base64 编解码
│   │   ├── UrlEncoder.vue         # URL 编解码
│   │   ├── TimestampConverter.vue # 时间戳转换
│   │   ├── RegexTester.vue        # 正则表达式测试
│   │   ├── ColorConverter.vue     # 颜色转换
│   │   └── HashCalculator.vue     # 哈希计算
│   ├── router/                    # 路由配置
│   │   └── index.ts
│   ├── stores/                    # 状态管理
│   │   └── app.ts                 # 应用状态
│   ├── i18n/                      # 国际化
│   │   ├── index.ts
│   │   ├── zh-CN.ts
│   │   └── en-US.ts
│   ├── utils/                     # 工具函数
│   │   ├── formatters.ts          # 前端格式化工具
│   │   ├── hash.ts                # 哈希计算（Web Crypto）
│   │   ├── clipboard.ts           # 剪贴板操作
│   │   └── window.ts              # 窗口控制
│   ├── styles/                    # 样式
│   │   ├── variables.css          # 设计 token（CSS 变量）
│   │   └── element-dark.scss      # Element Plus 暗色主题
│   └── assets/                    # 静态资源
├── src-tauri/                     # Tauri 后端
│   ├── src/
│   │   ├── lib.rs                 # 库入口
│   │   └── main.rs                # 二进制入口
│   ├── Cargo.toml                 # Rust 依赖
│   └── tauri.conf.json            # Tauri 配置
├── package.json                   # Node.js 依赖
├── vite.config.ts                 # Vite 配置
├── tsconfig.json                  # TypeScript 配置
└── docs/                          # 文档
    └── superpowers/
        └── specs/                 # 设计文档
```

---

## 3. 设计 Token / Design Tokens

### 3.1 CSS 变量 / CSS Variables

```css
/* styles/variables.css */
:root {
  /* 颜色 / Colors */
  --color-primary: #409eff;
  --color-success: #67c23a;
  --color-warning: #e6a23c;
  --color-danger: #f56c6c;
  --color-info: #909399;
  
  /* 背景色 / Background Colors */
  --bg-color: #ffffff;
  --bg-color-page: #f5f7fa;
  --bg-color-overlay: #ffffff;
  
  /* 文字色 / Text Colors */
  --text-color-primary: #303133;
  --text-color-regular: #606266;
  --text-color-secondary: #909399;
  --text-color-placeholder: #c0c4cc;
  
  /* 边框色 / Border Colors */
  --border-color: #dcdfe6;
  --border-color-light: #e4e7ed;
  --border-color-lighter: #ebeef5;
  
  /* 间距 / Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* 圆角 / Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* 阴影 / Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);
  
  /* 字体 / Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;
  
  /* 标题栏 / Title Bar */
  --titlebar-height: 32px;
  
  /* 侧边栏 / Sidebar */
  --sidebar-width: 200px;
  --sidebar-collapsed-width: 64px;
}

/* 深色主题 / Dark Theme */
html.dark {
  --bg-color: #1d1e1f;
  --bg-color-page: #141414;
  --bg-color-overlay: #1d1e1f;
  --text-color-primary: #e5eaf3;
  --text-color-regular: #cfd3dc;
  --text-color-secondary: #a3a6ad;
  --text-color-placeholder: #8d9095;
  --border-color: #4c4d4f;
  --border-color-light: #414243;
  --border-color-lighter: #363637;
}
```

---

## 4. 组件设计 / Component Design

### 4.1 TitleBar.vue（自定义标题栏）

**功能 / Features:**
- 显示应用名称和图标
- 窗口控制按钮（最小化、最大化、关闭）
- 支持拖拽移动窗口
- 极简风格设计
- 跨平台适配（macOS 左侧留安全区）

**实现要点 / Implementation Details:**
- 使用 Tauri 的 `getCurrentWindow` API 控制窗口
- 使用 `data-tauri-drag-region` 属性实现拖拽
- 使用 CSS 变量支持主题切换
- macOS 平台左侧留 70px 安全区（红绿灯按钮）

**Props:**
```typescript
interface TitleBarProps {
  title?: string  // 应用标题，默认 "ztools"
}
```

**窗口控制代码：**
```typescript
// utils/window.ts
import { getCurrentWindow } from '@tauri-apps/api/window'

export async function minimizeWindow() {
  await getCurrentWindow().minimize()
}

export async function maximizeWindow() {
  const win = getCurrentWindow()
  const isMaximized = await win.isMaximized()
  isMaximized ? await win.unmaximize() : await win.maximize()
}

export async function closeWindow() {
  await getCurrentWindow().close()
}
```

### 4.2 Sidebar.vue（侧边栏导航）

**功能 / Features:**
- 显示工具列表
- 当前工具高亮显示
- 支持图标和文字
- 可折叠
- 工具描述 tooltip

**实现要点 / Implementation Details:**
- 使用 Element Plus 的 `el-menu` 组件
- 使用 Vue Router 的 `router-link` 实现导航
- 使用 `useRoute` 获取当前路由
- 使用 lucide-vue-next 图标库

**数据结构 / Data Structure:**
```typescript
interface ToolItem {
  name: string        // 工具名称（i18n key）
  path: string        // 路由路径
  icon: Component     // lucide 图标组件
  description: string // 工具描述（i18n key）
}
```

### 4.3 ToolLayout.vue（工具页面布局）

**功能 / Features:**
- 输入区域（左侧/上方）
- 输出区域（右侧/下方）
- 操作按钮区域
- 统一的样式和交互
- 响应式布局（<900px 自动切换为上下布局）
- 复制/粘贴按钮
- 键盘快捷键支持

**Props:**
```typescript
interface ToolLayoutProps {
  title: string           // 工具标题（i18n key）
  inputLabel?: string     // 输入区域标签
  outputLabel?: string    // 输出区域标签
  showSwap?: boolean      // 是否显示交换按钮
  layout?: 'split' | 'stacked' | 'auto'  // 布局模式
}
```

**Slots:**
- `input` - 输入区域内容
- `output` - 输出区域内容
- `actions` - 操作按钮区域

**响应式断点：**
```css
.tool-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

@media (max-width: 900px) {
  .tool-layout {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. 路由设计 / Router Design

### 5.1 路由配置 / Router Configuration

```typescript
// router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/json' },
  { path: '/json', component: () => import('@/tools/JsonFormatter.vue') },
  { path: '/xml', component: () => import('@/tools/XmlFormatter.vue') },
  { path: '/base64', component: () => import('@/tools/Base64Tool.vue') },
  { path: '/url', component: () => import('@/tools/UrlEncoder.vue') },
  { path: '/timestamp', component: () => import('@/tools/TimestampConverter.vue') },
  { path: '/regex', component: () => import('@/tools/RegexTester.vue') },
  { path: '/color', component: () => import('@/tools/ColorConverter.vue') },
  { path: '/hash', component: () => import('@/tools/HashCalculator.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),  // 桌面应用必须使用 hash 模式
  routes,
})

export default router
```

### 5.2 路由守卫 / Router Guards

```typescript
// 记录最近使用的工具
router.afterEach((to) => {
  const appStore = useAppStore()
  appStore.addRecentTool(to.path)
})
```

---

## 6. 状态管理 / State Management

### 6.1 应用状态 / Application State

```typescript
// stores/app.ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 状态
  const theme = ref<'light' | 'dark' | 'system'>(
    (localStorage.getItem('theme') as any) || 'system'
  )
  const sidebarCollapsed = ref(false)
  const recentTools = ref<string[]>(
    JSON.parse(localStorage.getItem('recentTools') || '[]')
  )
  const locale = ref(localStorage.getItem('locale') || 'zh-CN')
  
  // 计算属性
  const isDark = ref(false)
  
  // 更新 isDark
  function updateIsDark() {
    if (theme.value === 'system') {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      isDark.value = theme.value === 'dark'
    }
  }
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', updateIsDark)
  updateIsDark()
  
  // 监听主题变化，更新 DOM 和 localStorage
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
    updateIsDark()
    document.documentElement.classList.toggle('dark', isDark.value)
  }, { immediate: true })
  
  // 监听语言变化
  watch(locale, (newLocale) => {
    localStorage.setItem('locale', newLocale)
  })
  
  // Actions
  function setTheme(newTheme: 'light' | 'dark' | 'system') {
    theme.value = newTheme
  }
  
  function setLocale(newLocale: string) {
    locale.value = newLocale
  }
  
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  
  function addRecentTool(path: string) {
    recentTools.value = [path, ...recentTools.value.filter(p => p !== path)].slice(0, 10)
    localStorage.setItem('recentTools', JSON.stringify(recentTools.value))
  }
  
  return {
    theme,
    sidebarCollapsed,
    recentTools,
    locale,
    isDark,
    setTheme,
    setLocale,
    toggleSidebar,
    addRecentTool,
  }
})
```

---

## 7. 国际化 / Internationalization

### 7.1 配置 / Configuration

```typescript
// i18n/index.ts
import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('locale') || 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

export default i18n
```

### 7.2 语言文件示例 / Language File Example

```typescript
// i18n/zh-CN.ts
export default {
  app: {
    title: 'ztools',
  },
  tools: {
    json: {
      name: 'JSON 格式化',
      description: 'JSON 数据格式化、压缩、验证',
    },
    xml: {
      name: 'XML 格式化',
      description: 'XML 数据格式化、压缩、验证',
    },
    // ... 其他工具
  },
  common: {
    input: '输入',
    output: '输出',
    format: '格式化',
    minify: '压缩',
    copy: '复制',
    paste: '粘贴',
    clear: '清空',
    swap: '交换',
    copied: '已复制',
    error: '错误',
  },
}
```

---

## 8. 自定义标题栏实现 / Custom Title Bar Implementation

### 8.1 Tauri 配置 / Tauri Configuration

```json
// tauri.conf.json
{
  "app": {
    "windows": [{
      "title": "ztools",
      "width": 1000,
      "height": 700,
      "minWidth": 800,
      "minHeight": 600,
      "decorations": false,
      "transparent": false,
      "center": true
    }]
  }
}
```

### 8.2 跨平台适配 / Cross-platform Adaptation

```vue
<!-- TitleBar.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Minus, Square, X, Maximize2 } from 'lucide-vue-next'
import { minimizeWindow, maximizeWindow, closeWindow } from '@/utils/window'

const isMac = ref(false)
const isMaximized = ref(false)

onMounted(() => {
  isMac.value = navigator.platform.includes('Mac')
})
</script>

<template>
  <div data-tauri-drag-region class="titlebar" :class="{ 'is-mac': isMac }">
    <div class="titlebar-title" :style="{ paddingLeft: isMac ? '70px' : '16px' }">
      🔧 {{ title }}
    </div>
    <div v-if="!isMac" class="titlebar-controls">
      <button class="titlebar-button" @click="minimizeWindow">
        <Minus :size="14" />
      </button>
      <button class="titlebar-button" @click="maximizeWindow">
        <Maximize2 :size="14" />
      </button>
      <button class="titlebar-button close" @click="closeWindow">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>
```

---

## 9. Element Plus 集成 / Element Plus Integration

### 9.1 安装和配置 / Installation and Configuration

```bash
npm install element-plus
npm install -D unplugin-vue-components unplugin-auto-import sass
```

### 9.2 Vite 配置 / Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
})
```

### 9.3 暗色主题 / Dark Theme

```typescript
// main.ts
import 'element-plus/theme-chalk/dark/css-vars.css'
```

---

## 10. 工具实现详情 / Tool Implementation Details

### 10.1 JSON 格式化 / JSON Formatter

**功能 / Features:**
- JSON 格式化（美化）
- JSON 压缩（最小化）
- JSON 语法验证
- 错误提示和定位（使用 ElMessage）

**实现方式 / Implementation:**
```typescript
// utils/formatters.ts
export function formatJson(input: string): string {
  const parsed = JSON.parse(input)
  return JSON.stringify(parsed, null, 2)
}

export function minifyJson(input: string): string {
  const parsed = JSON.parse(input)
  return JSON.stringify(parsed)
}
```

### 10.2 XML 格式化 / XML Formatter

**功能 / Features:**
- XML 格式化（美化）
- XML 压缩（最小化）
- XML 语法验证
- 错误提示（使用 ElMessage）

**实现方式 / Implementation:**
```typescript
export function formatXml(input: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(input, 'text/xml')
  
  // 检查解析错误
  const errorNode = doc.querySelector('parsererror')
  if (errorNode) {
    throw new Error('Invalid XML')
  }
  
  // 格式化
  const serializer = new XMLSerializer()
  // ... 格式化逻辑
}
```

### 10.3 Base64 编解码 / Base64 Encoder/Decoder

**功能 / Features:**
- 文本 Base64 编码（支持 UTF-8）
- 文本 Base64 解码（支持 UTF-8）

**实现方式 / Implementation:**
```typescript
export function base64Encode(input: string): string {
  const bytes = new TextEncoder().encode(input)
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(binary)
}

export function base64Decode(input: string): string {
  const binary = atob(input)
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
```

### 10.4 URL 编解码 / URL Encoder/Decoder

**实现方式 / Implementation:**
```typescript
export function urlEncode(input: string): string {
  return encodeURIComponent(input)
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input)
}
```

### 10.5 时间戳转换 / Timestamp Converter

**实现方式 / Implementation:**
```typescript
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp)
}

export function dateToTimestamp(date: Date): number {
  return date.getTime()
}
```

### 10.6 正则表达式测试 / Regex Tester

**实现方式 / Implementation:**
```typescript
export function testRegex(pattern: string, flags: string, input: string): RegExpMatchArray[] {
  const regex = new RegExp(pattern, flags)
  const matches: RegExpMatchArray[] = []
  let match
  
  if (flags.includes('g')) {
    while ((match = regex.exec(input)) !== null) {
      matches.push(match)
    }
  } else {
    match = regex.exec(input)
    if (match) matches.push(match)
  }
  
  return matches
}
```

### 10.7 颜色转换 / Color Converter

**实现方式 / Implementation:**
```typescript
export function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}
```

### 10.8 哈希计算 / Hash Calculator

**实现方式 / Implementation（Web Crypto API）:**
```typescript
// utils/hash.ts
export async function calculateHash(input: string, algorithm: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  
  const hashBuffer = await crypto.subtle.digest(algorithm, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256(input: string): Promise<string> {
  return calculateHash(input, 'SHA-256')
}

export async function sha1(input: string): Promise<string> {
  return calculateHash(input, 'SHA-1')
}
```

---

## 11. 错误处理 / Error Handling

### 11.1 统一错误提示 / Unified Error Notification

使用 Element Plus 的 `ElMessage` 组件进行错误提示：

```typescript
import { ElMessage } from 'element-plus'

export function showError(message: string) {
  ElMessage.error(message)
}

export function showSuccess(message: string) {
  ElMessage.success(message)
}

export function showWarning(message: string) {
  ElMessage.warning(message)
}
```

### 11.2 工具错误处理 / Tool Error Handling

```typescript
// 示例：JSON 格式化错误处理
function handleFormatJson(input: string) {
  try {
    output.value = formatJson(input)
    showSuccess(t('common.success'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      showError(t('errors.jsonSyntax', { message: error.message }))
    } else {
      showError(t('errors.unknown'))
    }
  }
}
```

---

## 12. 剪贴板集成 / Clipboard Integration

### 12.1 剪贴板工具 / Clipboard Utility

```typescript
// utils/clipboard.ts
import { ElMessage } from 'element-plus'

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
    return true
  } catch {
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('已复制')
    return true
  }
}

export async function pasteFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return ''
  }
}
```

---

## 13. 键盘快捷键 / Keyboard Shortcuts

### 13.1 全局快捷键 / Global Shortcuts

```typescript
// 在 ToolLayout.vue 中
const shortcuts = {
  'ctrl+enter': () => handleExecute(),
  'ctrl+c': () => handleCopy(),
  'ctrl+v': () => handlePaste(),
  'ctrl+l': () => handleClear(),
}

function handleKeydown(event: KeyboardEvent) {
  const key = [
    event.ctrlKey ? 'ctrl' : '',
    event.shiftKey ? 'shift' : '',
    event.altKey ? 'alt' : '',
    event.key.toLowerCase(),
  ].filter(Boolean).join('+')
  
  if (shortcuts[key]) {
    event.preventDefault()
    shortcuts[key]()
  }
}
```

---

## 14. 开发计划 / Development Plan

### 14.1 阶段一：基础架构 / Phase 1: Basic Architecture

- [ ] 初始化项目，安装依赖
- [ ] 配置 Element Plus + 暗色主题
- [ ] 配置 vue-i18n 国际化
- [ ] 实现设计 token（CSS 变量）
- [ ] 实现自定义标题栏（跨平台适配）
- [ ] 实现侧边栏导航
- [ ] 配置路由（Hash 模式）
- [ ] 实现 ToolLayout 组件（响应式）

### 14.2 阶段二：核心工具 / Phase 2: Core Tools

- [ ] 实现 JSON 格式化工具
- [ ] 实现 XML 格式化工具
- [ ] 实现 Base64 编解码工具（UTF-8 支持）
- [ ] 实现 URL 编解码工具

### 14.3 阶段三：扩展工具 / Phase 3: Extended Tools

- [ ] 实现时间戳转换工具
- [ ] 实现正则表达式测试工具
- [ ] 实现颜色转换工具
- [ ] 实现哈希计算工具（Web Crypto）

### 14.4 阶段四：优化和完善 / Phase 4: Optimization and Polish

- [ ] 剪贴板集成
- [ ] 键盘快捷键
- [ ] 错误处理完善
- [ ] 性能优化
- [ ] 单元测试

---

## 15. 测试策略 / Testing Strategy

### 15.1 单元测试 / Unit Tests

使用 Vitest 进行单元测试：

```typescript
// utils/__tests__/formatters.test.ts
import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson } from '../formatters'

describe('JSON Formatter', () => {
  it('should format JSON', () => {
    const input = '{"name":"test","age":18}'
    const expected = '{\n  "name": "test",\n  "age": 18\n}'
    expect(formatJson(input)).toBe(expected)
  })
  
  it('should throw error for invalid JSON', () => {
    const input = '{invalid}'
    expect(() => formatJson(input)).toThrow()
  })
})
```

### 15.2 测试覆盖目标 / Coverage Target

- 工具函数：90% 覆盖率
- 组件：70% 覆盖率

---

## 16. 设计决策 / Design Decisions

### 16.1 为什么选择纯前端架构？ / Why Pure Frontend Architecture?

1. **简洁性 / Simplicity:** 无需维护 Rust 后端代码
2. **性能足够 / Sufficient Performance:** Web Crypto API 性能满足需求
3. **易于维护 / Easy Maintenance:** 单一技术栈，降低复杂度

### 16.2 为什么选择 Element Plus？ / Why Element Plus?

1. **成熟稳定 / Mature and Stable:** 经过大量项目验证
2. **组件丰富 / Rich Components:** 满足各种 UI 需求
3. **TypeScript 支持 / TypeScript Support:** 类型安全
4. **主题定制 / Theme Customization:** 支持深色/浅色主题

### 16.3 为什么使用 vue-i18n？ / Why vue-i18n?

1. **官方推荐 / Official Recommendation:** Vue 国际化标准方案
2. **Composition API 支持 / Composition API Support:** 与 Vue 3 完美集成
3. **类型安全 / Type Safe:** TypeScript 支持完善

---

## 17. 总结 / Summary

ztools 工具集设计采用纯前端架构，使用 Vue 3 + Element Plus + Tauri 技术栈。所有工具逻辑在前端实现，Tauri 仅作为桌面容器。设计包含完整的国际化支持、主题切换、响应式布局、键盘快捷键和剪贴板集成。

The ztools toolkit design uses a pure frontend architecture with Vue 3 + Element Plus + Tauri tech stack. All tool logic is implemented in the frontend, with Tauri serving only as a desktop container. The design includes complete internationalization support, theme switching, responsive layout, keyboard shortcuts, and clipboard integration.

---

**设计完成 / Design Complete**
**版本 / Version:** 2.0
**状态 / Status:** 评审通过 / Review Passed
**下一步 / Next Step:** 开始实现 / Start Implementation