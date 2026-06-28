# ztools UI 优化设计文档

## 1. 背景与目标

`ztools` 是一个面向开发者的桌面工具箱，基于 Tauri v2 + Vue 3 + Element Plus 构建。当前界面存在风格不统一、布局动线混乱、交互效率低等问题。本文档目标是在不推翻现有业务逻辑和路由的前提下，通过统一设计系统、重构共享组件、优化布局与交互，让应用界面达到"清晰、专业、好用"的标准。

## 2. 当前问题诊断

### 2.1 视觉风格不统一

- 同时混用 Element Plus 组件与大量自定义按钮、输入框、面板样式；
- 8 个工具页面各自重复定义 `.action-button`、`.icon-button`、`.output-content`、textarea 样式，违反 DRY 原则；
- `JsonFormatter.vue` 和 `XmlFormatter.vue` 中错误背景使用硬编码 `#fef0f0`，未走 design token；
- 标题栏使用 emoji `🔧`，不够专业。

### 2.2 布局信息层级弱

- `ToolLayout` 采用 `输入面板 | 操作按钮 | 输出面板` 三栏布局，操作按钮被垂直挤压在中间；
- 用户视线需要在输入、操作、输出之间左右横跳，动线不自然；
- 标题栏除窗口控制外没有其他全局功能入口；
- 侧边栏只有工具列表，没有搜索和最近使用。

### 2.3 交互效率低

- 没有工具搜索功能；
- `appStore` 已保存 `recentTools`，但 UI 没有展示入口；
- `theme` 支持 Light / Dark / System，但界面没有切换入口；
- 输出区只是 `<pre>`，JSON/XML 没有语法高亮；
- 主要操作缺少键盘快捷键。

## 3. 方案选择

### 3.1 可选方案

| 方案 | 核心思路 | 优点 | 缺点 |
|------|---------|------|------|
| A. 统一设计系统 + 布局微重构（推荐） | 保留业务逻辑，重构共享组件，改为上下布局动线 | 改动可控，效果显著 | 不从根本上改变线性工作流 |
| B. 保守式视觉刷新 | 只统一样式、换肤，不动布局 | 工作量最小 | 不解决交互效率问题 |
| C. 完整重设计 + 配置化工具 | JSON Schema 驱动工具渲染，重构导航 | 长期维护成本最低 | 工程量大，风险高 |

### 3.2 推荐方案

采用 **方案 A**。它能在不推翻现有架构的前提下，一次性解决当前界面最主要的三个根因：风格不统一、布局动线混乱、交互效率低。性价比最高，适合作为本次迭代的范围。

## 4. 详细设计

### 4.1 整体布局与信息架构

新布局如下：

```
桌面端（split 模式）：
┌────────────────────────────────────────────────────────────┐
│ [icon] ztools          [搜索]    [主题] [语言] [— □ ×]     │  ← TitleBar
├──────────┬─────────────────────────────────────────────────┤
│          │  JSON 格式化                                      │
│  🔍 搜索  │  ┌──────────────────┬──────────────────────┐   │
│  ──────── │  │  输入            │  输出                │   │
│  📌 最近  │  │  [textarea]      │  [格式化][压缩][清空]│   │
│  ──────── │  │                  │  [formatted output]  │   │
│  JSON     │  └──────────────────┴──────────────────────┘   │
│  XML      │                                                │
│  ...      │                                                │
└──────────┴─────────────────────────────────────────────────┘

窄窗口/移动端（stacked 模式）：
┌────────────────────────────────────────┐
│ [icon] ztools    [主题] [语言] [— □ ×] │
├────────────────────────────────────────┤
│ 输入                                   │
│ [textarea]                             │
│ [格式化] [压缩] [清空]                 │
│ 输出                                   │
│ [formatted output]                     │
└────────────────────────────────────────┘
```

**关键改动**：

1. `ToolLayout` 支持三种布局模式：`split`（桌面端默认，左右分栏）、`stacked`（上下堆叠）、`auto`（根据容器宽度自动切换）。桌面端默认左右分栏以利用宽屏对比输入输出；窗口宽度 < 900px 时自动切换为 `stacked`。
2. 操作按钮从原"三明治"中间区域移到输出面板顶部工具栏：主要操作用 `el-button type="primary"`，次要操作用默认/文字按钮。这样既保留左右对比，又让动线变成"输入 → 操作 → 输出"。
3. 侧边栏增加搜索框，支持中英文模糊匹配，快捷键 `Cmd/Ctrl+K`。
4. 主内容区顶部新增全局工具栏，放置主题切换、语言切换入口；标题栏保持纯拖拽 + 窗口控制，避免与 Tauri 拖拽区域冲突。
5. 响应式策略：App 级别保持侧边栏 + 主内容区的左右布局；窗口宽度 < 768px 时侧边栏折叠为图标栏。

**不变部分**：路由结构、Pinia store、i18n key、Tauri 窗口控制逻辑。

### 4.2 组件重构

抽象以下共享组件，消除重复样式：

#### `ToolPanel`

替代 `ToolLayout` 内硬编码的输入/输出面板。

```vue
<ToolPanel :title="t('common.input')">
  <slot />
  <template #actions>
    <slot name="actions" />
  </template>
</ToolPanel>
```

- 统一标题、内边距、边框、圆角、阴影；
- 支持 `actions` slot；
- 输出面板支持 `copyable` prop，自动显示复制按钮。

#### `ToolActionBar`

```vue
<ToolActionBar>
  <el-button type="primary" :icon="Braces" @click="handleFormat">
    {{ t('common.format') }}
  </el-button>
  <el-button :icon="Copy" @click="handleCopy">
    {{ t('common.copy') }}
  </el-button>
  <el-button :icon="Trash2" @click="handleClear">
    {{ t('common.clear') }}
  </el-button>
</ToolActionBar>
```

- 横向排列，主要操作用 primary，次要操作用默认样式；
- 统一间距与响应式换行。

#### `CodeOutput`

```vue
<CodeOutput :content="output" :error="error" language="json" copyable />
```

- 支持纯文本、JSON、XML、Regex 结果展示；
- 集成 `highlight.js` 做 JSON/XML 语法高亮；
- 错误状态时显示 `el-alert`。

#### `ToolTextarea`

```vue
<ToolTextarea v-model="input" :placeholder="t('common.placeholder')" />
```

- 统一等宽字体、内边距、聚焦样式、背景色；
- 高度可配置，默认占满面板。

#### `Sidebar` 增强

- 顶部搜索框（`el-input` + `Search` 图标）；
- "最近使用"分组（读取 `appStore.recentTools`）；
- 菜单项改用 Element Plus `el-menu` 风格；
- 折叠按钮保留在底部。

#### `TitleBar` 增强

- 去掉 `🔧` emoji，改用 `Wrench` lucide 图标；
- 右侧新增主题切换下拉（Light / Dark / System）和语言切换；
- Windows 控制按钮保持当前行为，Mac 保持隐藏。

### 4.3 视觉系统

扩展 `src/styles/variables.css`，引入语义化 token：

```css
:root {
  --color-primary: #409eff;
  --color-primary-light: #a0cfff;
  --color-primary-lighter: #d9ecff;

  --surface-page: #f5f7fa;
  --surface-card: #ffffff;
  --surface-elevated: #ffffff;

  --text-title: #303133;
  --text-body: #606266;
  --text-caption: #909399;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-card-hover: 0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.1);

  --radius-card: 12px;
  --radius-button: 8px;
}
```

**视觉规则**：

- 面板统一用 `surface-card` + `shadow-card` + `radius-card`；
- 标题栏和侧边栏用 `surface-card`，与页面背景形成层次；
- 主要操作按钮用 `el-button type="primary"`；
- 错误提示统一用 `var(--color-danger)` 文字 + 浅色背景；
- 暗色模式通过 `html.dark` 覆盖 token，Element Plus dark css-vars 已在 `main.ts` 引入。

### 4.4 交互改进

1. **工具搜索**
   - 快捷键 `Cmd/Ctrl+K` 聚焦搜索框；
   - 实时过滤工具列表，支持中英文模糊匹配；
   - 回车打开第一个匹配项。

2. **最近使用**
   - 侧边栏顶部显示最近 5 个工具；
   - 复用已有的 `appStore.addRecentTool(path)`。

3. **主题/语言切换**
   - 标题栏右侧 `el-dropdown`；
   - 主题：Light / Dark / System；
   - 语言：中文 / English。

4. **一键复制与清空**
   - 所有工具统一提供复制输出按钮；
   - 清空无需确认，但提供 `ElMessage` 反馈。

5. **输出区改进**
   - JSON/XML 输出使用等宽预格式化文本，保持简洁可读；
   - `CodeOutput` 组件保留 `language` prop，为未来引入语法高亮预留接口；
   - 空状态显示占位提示。

6. **键盘友好**
   - 主要操作支持 `Cmd/Ctrl+Enter` 触发；
   - 表单内 `Tab` 顺序自然切换。

## 5. 数据流与状态管理

不新增 store，复用现有 `useAppStore`：

- `theme`：供 `TitleBar` 主题切换和全局暗色模式使用；
- `locale`：供 `TitleBar` 语言切换使用；
- `sidebarCollapsed`：供侧边栏折叠使用；
- `recentTools`：供侧边栏"最近使用"分组使用。

各工具页面保持本地 `ref` 状态，不引入全局状态。共享组件通过 props 和 emits 与工具页面通信。

## 6. 测试计划

1. **单元测试**
   - 新增共享组件（`ToolPanel`、`ToolActionBar`、`CodeOutput`、`ToolTextarea`）需要补充渲染测试和交互测试；
   - 确保暗色模式切换正确更新 DOM class；
   - 确保搜索过滤逻辑正确。

2. **视觉回归**
   - 在 Light / Dark 两种主题下验证每个工具页面；
   - 验证侧边栏展开/折叠状态。

3. **手动 QA**
   - 每个工具的 格式化/编码/转换/计算 功能正常；
   - 复制、清空按钮工作正常；
   - 快捷键 `Cmd/Ctrl+K`、`Cmd/Ctrl+Enter` 可用；
   - 窗口控制按钮（最小化/最大化/关闭）不受影响。

## 7. 范围与不在范围

**在本次范围内**：

- 统一视觉系统（token、组件）；
- `ToolLayout` 布局改为上下结构；
- 新增/增强 `ToolPanel`、`ToolActionBar`、`CodeOutput`、`ToolTextarea` 共享组件；
- 增强 `Sidebar`（搜索、最近使用）；
- 增强 `TitleBar`（主题、语言切换）；
- JSON/XML 输出语法高亮；
- 主要操作快捷键。

**不在本次范围内**：

- 路由结构变更；
- 工具功能新增或删除；
- 后端 Rust 逻辑修改；
- 配置化/Schema 化工具渲染（属于方案 C）；
- 引入 Monaco Editor 等重型编辑器；
- 用户自定义工具排序/收藏；
- 历史记录持久化（当前 `recentTools` 仅保存访问路径）。

## 8. 风险与回退策略

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Element Plus 组件样式与自定义样式冲突 | 中 | 使用 Element Plus 的 CSS 变量，避免硬编码覆盖；变更后做全页面视觉回归 |
| `highlight.js` 增加包体积 | 低 | 仅导入 `json` 和 `xml` 语言包，按需加载 |
| 快捷键与系统快捷键冲突 | 低 | 使用 `Cmd/Ctrl+K` 和 `Cmd/Ctrl+Enter` 前做跨平台测试 |
| 现有测试失效 | 中 | 修改组件后同步更新 `tools/__tests__` 和新增组件测试 |

## 9. 实施顺序建议

1. 扩展 `variables.css` 和 `global.css`；
2. 创建共享组件 `ToolPanel`、`ToolActionBar`、`CodeOutput`、`ToolTextarea`；
3. 重构 `ToolLayout`；
4. 重构 `TitleBar`（主题/语言切换）；
5. 重构 `Sidebar`（搜索/最近使用）；
6. 逐个迁移 8 个工具页面，删除重复样式；
7. 补充测试并做视觉回归。
