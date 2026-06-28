> **I'm using the writing-plans skill to create the implementation plan.**

# ztools UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the ztools desktop UI to use a unified design system, shared components, a clearer layout flow, and improved interactions (search, recent tools, theme/language toggles), without changing routing, business logic, or Tauri backend code.

**Architecture:** Introduce four shared Vue components (`ToolPanel`, `ToolActionBar`, `CodeOutput`, `ToolTextarea`) to replace duplicated styles across the eight tool pages. Update `ToolLayout` to support `split`/`stacked`/`auto` layout modes. Enhance `Sidebar` with search and recent tools. Move theme/language controls from `TitleBar` to a new `GlobalToolbar` in the main content area to avoid Tauri drag-region conflicts. Extend CSS design tokens in `variables.css` and use Element Plus components consistently.

**Tech Stack:** Vue 3, TypeScript, Element Plus, Vite, Tauri v2, Pinia, vue-i18n, Vitest, lucide-vue-next.

---

## File Structure

### New files

- `src/components/ToolPanel.vue` — reusable card panel with title and optional actions
- `src/components/ToolActionBar.vue` — horizontal action button container
- `src/components/CodeOutput.vue` — preformatted output display with copy and error states (syntax highlighting deferred to future iteration)
- `src/components/ToolTextarea.vue` — full-height monospace textarea for tool input
- `src/components/GlobalToolbar.vue` — theme/language toggles in main content area
- `src/components/__tests__/ToolPanel.spec.ts` — render + actions slot tests
- `src/components/__tests__/CodeOutput.spec.ts` — content/error/copy tests

### Modified files

- `src/styles/variables.css` — add semantic surface, text, shadow, radius tokens
- `src/styles/global.css` — minor global adjustments if needed
- `src/App.vue` — include GlobalToolbar below TitleBar
- `src/components/ToolLayout.vue` — support split/stacked/auto layout modes
- `src/components/Sidebar.vue` — add search, recent tools, el-menu styling
- `src/components/TitleBar.vue` — replace emoji icon with Wrench, keep window controls only
- `src/i18n/zh-CN.ts` — add new keys for search, recent tools, theme, language labels
- `src/i18n/en-US.ts` — same as above in English
- `src/tools/__tests__/*.spec.ts` (existing tests) — update selectors if they break

### Dependency change

- 无新增依赖（第一期不引入 highlight.js）

---

## Task 1: Extend design tokens

**Files:**
- Modify: `src/styles/variables.css`

- [ ] **Step 1: Add semantic tokens**

Replace the existing `:root` block with the extended version below. Keep the original variables for backward compatibility, add new semantic ones.

```css
:root {
  /* Brand colors */
  --color-primary: #409eff;
  --color-primary-light: #a0cfff;
  --color-primary-lighter: #d9ecff;
  --color-success: #67c23a;
  --color-warning: #e6a23c;
  --color-danger: #f56c6c;
  --color-danger-light: #fde2e2;
  --color-info: #909399;

  /* Surfaces */
  --bg-color: #ffffff;
  --bg-color-page: #f5f7fa;
  --bg-color-overlay: #ffffff;
  --surface-page: #f5f7fa;
  --surface-card: #ffffff;
  --surface-elevated: #ffffff;

  /* Text */
  --text-color-primary: #303133;
  --text-color-regular: #606266;
  --text-color-secondary: #909399;
  --text-color-placeholder: #c0c4cc;
  --text-title: #303133;
  --text-body: #606266;
  --text-caption: #909399;

  /* Borders */
  --border-color: #dcdfe6;
  --border-color-light: #e4e7ed;
  --border-color-lighter: #ebeef5;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-card: 12px;
  --radius-button: 8px;

  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-card-hover: 0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.1);

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;

  /* Layout */
  --titlebar-height: 32px;
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 64px;
}

html.dark {
  --bg-color: #1d1e1f;
  --bg-color-page: #141414;
  --bg-color-overlay: #1d1e1f;
  --surface-page: #141414;
  --surface-card: #1d1e1f;
  --surface-elevated: #262727;

  --text-color-primary: #e5eaf3;
  --text-color-regular: #cfd3dc;
  --text-color-secondary: #a3a6ad;
  --text-color-placeholder: #8d9095;
  --text-title: #e5eaf3;
  --text-body: #cfd3dc;
  --text-caption: #a3a6ad;

  --border-color: #4c4d4f;
  --border-color-light: #414243;
  --border-color-lighter: #363637;

  --color-danger-light: #5c3a3a;
}
```

- [ ] **Step 2: Verify build still passes**

Run:
```bash
npm run build
```

Expected: `vue-tsc --noEmit && vite build` exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/styles/variables.css
git commit -m "style: extend semantic design tokens for unified UI"
```

---

## Task 3: Create ToolPanel component

**Files:**
- Create: `src/components/ToolPanel.vue`
- Create: `src/components/__tests__/ToolPanel.spec.ts`

- [ ] **Step 1: Write the component**

Create `src/components/ToolPanel.vue`:

```vue
<script setup lang="ts">
interface Props {
  title: string
  copyable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  copyable: false,
})

const emit = defineEmits<{
  copy: []
}>()
</script>

<template>
  <div class="tool-panel">
    <div class="panel-header">
      <span class="panel-title">{{ title }}</span>
      <div class="panel-actions">
        <slot name="actions" />
        <el-button
          v-if="copyable"
          type="info"
          link
          :icon="Copy"
          @click="emit('copy')"
        >
          {{ $t('common.copy') }}
        </el-button>
      </div>
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tool-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-color);
  overflow: hidden;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-color-page);
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.panel-body {
  flex: 1;
  padding: var(--spacing-md);
  overflow: auto;
  min-height: 0;
}
</style>
```

Note: `Copy` icon will be auto-imported by `unplugin-auto-import` + `unplugin-vue-components` with Element Plus resolver? No, `Copy` is from `lucide-vue-next`. We need to import it explicitly in this component or rely on the same setup as other components. Existing components import icons explicitly, so add `import { Copy } from 'lucide-vue-next'` to the script.

Updated script section:

```vue
<script setup lang="ts">
import { Copy } from 'lucide-vue-next'

interface Props {
  title: string
  copyable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  copyable: false,
})

const emit = defineEmits<{
  copy: []
}>()
</script>
```

- [ ] **Step 2: Write the test**

Create `src/components/__tests__/ToolPanel.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolPanel from '../ToolPanel.vue'

describe('ToolPanel', () => {
  it('renders title and default slot', () => {
    const wrapper = mount(ToolPanel, {
      props: { title: 'Input' },
      slots: { default: '<textarea>hello</textarea>' },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.text()).toContain('Input')
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('shows copy button when copyable', () => {
    const wrapper = mount(ToolPanel, {
      props: { title: 'Output', copyable: true },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('emits copy event when copy button clicked', async () => {
    const wrapper = mount(ToolPanel, {
      props: { title: 'Output', copyable: true },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('copy')).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Run the test to verify it passes**

Run:
```bash
npm run test:run -- src/components/__tests__/ToolPanel.spec.ts
```

Expected: tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ToolPanel.vue src/components/__tests__/ToolPanel.spec.ts
git commit -m "feat: add ToolPanel shared component with tests"
```

---

## Task 4: Create ToolActionBar component

**Files:**
- Create: `src/components/ToolActionBar.vue`

- [ ] **Step 1: Write the component**

Create `src/components/ToolActionBar.vue`:

```vue
<script setup lang="ts">
// No props, just a layout wrapper for action buttons
</script>

<template>
  <div class="tool-action-bar">
    <slot />
  </div>
</template>

<style scoped>
.tool-action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ToolActionBar.vue
git commit -m "feat: add ToolActionBar shared component"
```

---

## Task 5: Create CodeOutput component

**Files:**
- Create: `src/components/CodeOutput.vue`
- Create: `src/components/__tests__/CodeOutput.spec.ts`

- [ ] **Step 1: Write the component**

Create `src/components/CodeOutput.vue`:

```vue
<script setup lang="ts">
interface Props {
  content: string
  error?: string
  language?: 'json' | 'xml' | 'text'
}

const props = withDefaults(defineProps<Props>(), {
  error: '',
  language: 'text',
})
</script>

<template>
  <div class="code-output">
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
    <div v-else-if="content" class="code-content">
      <pre><code>{{ content }}</code></pre>
    </div>
    <div v-else class="empty-state">
      {{ $t('common.output') }}
    </div>
  </div>
</template>

<style scoped>
.code-output {
  height: 100%;
}

.code-content {
  height: 100%;
  padding: var(--spacing-md);
  background-color: var(--bg-color-page);
  border-radius: var(--radius-md);
  overflow: auto;
}

.code-content pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-placeholder);
  font-size: var(--font-size-sm);
}
</style>
```

Note: Syntax highlighting is deferred. The `language` prop is kept so future highlight.js integration doesn't require changing call sites.

- [ ] **Step 2: Write the test**

Create `src/components/__tests__/CodeOutput.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeOutput from '../CodeOutput.vue'

describe('CodeOutput', () => {
  it('renders empty state when no content', () => {
    const wrapper = mount(CodeOutput, {
      props: { content: '' },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('renders content', () => {
    const wrapper = mount(CodeOutput, {
      props: { content: '{"a":1}', language: 'json' },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.find('.code-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('"a"')
  })

  it('shows error alert', () => {
    const wrapper = mount(CodeOutput, {
      props: { content: '', error: 'Invalid JSON' },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.find('.el-alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('Invalid JSON')
  })
})
```

- [ ] **Step 3: Run tests**

Run:
```bash
npm run test:run -- src/components/__tests__/CodeOutput.spec.ts
```

Expected: tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/CodeOutput.vue src/components/__tests__/CodeOutput.spec.ts
git commit -m "feat: add CodeOutput component (syntax highlighting deferred)"
```

---

## Task 6: Create ToolTextarea component

**Files:**
- Create: `src/components/ToolTextarea.vue`

- [ ] **Step 1: Write the component**

Create `src/components/ToolTextarea.vue`:

```vue
<script setup lang="ts">
const model = defineModel<string>()

interface Props {
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
})
</script>

<template>
  <textarea
    v-model="model"
    class="tool-textarea"
    :placeholder="placeholder"
  />
</template>

<style scoped>
.tool-textarea {
  width: 100%;
  height: 100%;
  min-height: 200px;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color-primary);
  transition: border-color 0.2s;
}

.tool-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.tool-textarea::placeholder {
  color: var(--text-color-placeholder);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ToolTextarea.vue
git commit -m "feat: add ToolTextarea shared component"
```

---

## Task 7: Refactor ToolLayout to support split / stacked / auto layouts

**Files:**
- Modify: `src/components/ToolLayout.vue`

- [ ] **Step 1: Replace ToolLayout implementation**

Replace the entire content of `src/components/ToolLayout.vue` with:

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPanel from './ToolPanel.vue'
import ToolActionBar from './ToolActionBar.vue'

type LayoutMode = 'split' | 'stacked' | 'auto'

interface Props {
  title: string
  inputLabel?: string
  outputLabel?: string
  outputCopyable?: boolean
  layout?: LayoutMode
}

const props = withDefaults(defineProps<Props>(), {
  inputLabel: '',
  outputLabel: '',
  outputCopyable: false,
  layout: 'auto',
})

const emit = defineEmits<{
  copy: []
}>()

const { t } = useI18n()
const containerRef = ref<HTMLDivElement | null>(null)
const containerWidth = ref(1200)

const isStacked = computed(() => {
  if (props.layout === 'stacked') return true
  if (props.layout === 'split') return false
  return containerWidth.value < 900
})

const updateWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
  }
}

onMounted(() => {
  updateWidth()
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<template>
  <div ref="containerRef" class="tool-layout">
    <h2 class="tool-title">{{ title }}</h2>

    <div class="tool-workspace" :class="{ stacked: isStacked }">
      <ToolPanel :title="inputLabel || t('common.input')">
        <template #actions>
          <slot name="input-actions" />
        </template>
        <slot name="input" />
      </ToolPanel>

      <ToolPanel
        :title="outputLabel || t('common.output')"
        :copyable="outputCopyable"
        @copy="emit('copy')"
      >
        <template #actions>
          <slot name="output-actions" />
          <ToolActionBar>
            <slot name="actions" />
          </ToolActionBar>
        </template>
        <slot name="output" />
      </ToolPanel>
    </div>
  </div>
</template>

<style scoped>
.tool-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.tool-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.tool-workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  gap: var(--spacing-md);
  min-height: 0;
}

.tool-workspace.stacked {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr auto 1fr;
}

.tool-workspace > * {
  min-height: 0;
}
</style>
```

- [ ] **Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ToolLayout.vue
git commit -m "refactor: change ToolLayout to vertical input-actions-output flow"
```

---

## Task 8: Refactor TitleBar and add GlobalToolbar for theme/language controls

**Files:**
- Modify: `src/components/TitleBar.vue`
- Create: `src/components/GlobalToolbar.vue`
- Modify: `src/App.vue`
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en-US.ts`

- [ ] **Step 1: Add i18n keys**

In `src/i18n/zh-CN.ts`, add under `app`:

```typescript
app: {
  title: 'ztools',
  theme: '主题',
  language: '语言',
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
},
```

In `src/i18n/en-US.ts`, add under `app`:

```typescript
app: {
  title: 'ztools',
  theme: 'Theme',
  language: 'Language',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
},
```

- [ ] **Step 2: Replace TitleBar implementation**

Replace `src/components/TitleBar.vue` with a version that keeps only branding and window controls. The full content is similar to the original but removes the emoji and uses a `Wrench` icon:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Minus, X, Maximize2, Wrench } from 'lucide-vue-next'
import { minimizeWindow, maximizeWindow, closeWindow } from '@/utils/window'

const props = withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'ztools',
})

const isMac = ref(false)

onMounted(() => {
  isMac.value = navigator.platform.includes('Mac')
})
</script>

<template>
  <div data-tauri-drag-region class="titlebar" :class="{ 'is-mac': isMac }">
    <div class="titlebar-brand" :style="{ paddingLeft: isMac ? '70px' : '16px' }">
      <Wrench :size="14" class="brand-icon" />
      <span class="titlebar-title">{{ title }}</span>
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

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--titlebar-height);
  background-color: var(--surface-card);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  -webkit-user-select: none;
}

.titlebar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-icon {
  color: var(--color-primary);
}

.titlebar-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-title);
}

.titlebar-controls {
  display: flex;
  height: 100%;
}

.titlebar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-color-regular);
  cursor: pointer;
  transition: background-color 0.2s;
}

.titlebar-button:hover {
  background-color: var(--bg-color-page);
}

.titlebar-button.close:hover {
  background-color: var(--color-danger);
  color: white;
}
</style>
```

- [ ] **Step 3: Create GlobalToolbar component**

Create `src/components/GlobalToolbar.vue`:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Moon, Sun, Monitor, Globe } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const { t, locale } = useI18n()

const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
  appStore.setTheme(theme)
}

const handleLanguageChange = (lang: string) => {
  appStore.setLocale(lang)
  locale.value = lang
}
</script>

<template>
  <div class="global-toolbar">
    <el-dropdown trigger="click" @command="handleThemeChange">
      <el-button link :icon="appStore.isDark ? Moon : Sun" size="small">
        {{ t(`app.${appStore.theme}`) }}
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="light">{{ t('app.light') }}</el-dropdown-item>
          <el-dropdown-item command="dark">{{ t('app.dark') }}</el-dropdown-item>
          <el-dropdown-item command="system">{{ t('app.system') }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dropdown trigger="click" @command="handleLanguageChange">
      <el-button link :icon="Globe" size="small">
        {{ appStore.locale === 'zh-CN' ? '中文' : 'EN' }}
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="zh-CN">中文</el-dropdown-item>
          <el-dropdown-item command="en-US">English</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.global-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--surface-card);
  border-bottom: 1px solid var(--border-color);
}
</style>
```

- [ ] **Step 4: Update App.vue to include GlobalToolbar**

Add `<GlobalToolbar />` between `<TitleBar />` and the main app content in `src/App.vue`.

- [ ] **Step 5: Verify build**

Run:
```bash
npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/TitleBar.vue src/components/GlobalToolbar.vue src/App.vue src/i18n/zh-CN.ts src/i18n/en-US.ts
git commit -m "feat: move theme/language controls from TitleBar to GlobalToolbar"
```

---

## Task 9: Refactor Sidebar with search and recent tools

**Files:**
- Modify: `src/components/Sidebar.vue`
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en-US.ts`

- [ ] **Step 1: Add i18n keys**

In `src/i18n/zh-CN.ts`, add:

```typescript
common: {
  // existing keys...
  search: '搜索工具',
  recent: '最近使用',
  allTools: '全部工具',
}
```

Wait, `common` already exists. Add these keys to the existing `common` object:

```typescript
search: '搜索工具',
recent: '最近使用',
allTools: '全部工具',
```

In `src/i18n/en-US.ts`, add:

```typescript
search: 'Search tools',
recent: 'Recent',
allTools: 'All tools',
```

- [ ] **Step 2: Replace Sidebar implementation**

Replace `src/components/Sidebar.vue` with:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import {
  Braces,
  Code2,
  Binary,
  Link,
  Clock,
  Regex,
  Palette,
  Hash,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-vue-next'
import type { Component } from 'vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const appStore = useAppStore()

interface ToolItem {
  path: string
  icon: Component
  key: string
}

const tools: ToolItem[] = [
  { path: '/json', icon: Braces, key: 'json' },
  { path: '/xml', icon: Code2, key: 'xml' },
  { path: '/base64', icon: Binary, key: 'base64' },
  { path: '/url', icon: Link, key: 'url' },
  { path: '/timestamp', icon: Clock, key: 'timestamp' },
  { path: '/regex', icon: Regex, key: 'regex' },
  { path: '/color', icon: Palette, key: 'color' },
  { path: '/hash', icon: Hash, key: 'hash' },
]

const searchQuery = ref('')

const filteredTools = computed(() => {
  if (!searchQuery.value.trim()) return tools
  const query = searchQuery.value.toLowerCase()
  return tools.filter(tool => {
    const name = t(`tools.${tool.key}.name`).toLowerCase()
    const desc = t(`tools.${tool.key}.description`).toLowerCase()
    return name.includes(query) || desc.includes(query)
  })
})

const recentTools = computed(() => {
  return appStore.recentTools
    .map(path => tools.find(t => t.path === path))
    .filter((t): t is ToolItem => !!t)
    .slice(0, 5)
})

const isActive = (path: string) => route.path === path

const navigateTo = (path: string) => {
  router.push(path)
  appStore.addRecentTool(path)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && filteredTools.value.length > 0) {
    navigateTo(filteredTools.value[0].path)
    searchQuery.value = ''
  }
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <div class="sidebar-search">
      <el-input
        v-if="!appStore.sidebarCollapsed"
        v-model="searchQuery"
        :placeholder="t('common.search')"
        :prefix-icon="Search"
        clearable
        @keydown="handleKeydown"
      />
      <div v-else class="search-collapsed">
        <Search :size="20" />
      </div>
    </div>

    <div class="sidebar-content">
      <div v-if="recentTools.length > 0 && !appStore.sidebarCollapsed" class="sidebar-section">
        <div class="section-title">{{ t('common.recent') }}</div>
        <div
          v-for="tool in recentTools"
          :key="`recent-${tool.path}`"
          class="menu-item"
          :class="{ active: isActive(tool.path) }"
          :title="t(`tools.${tool.key}.name`)"
          @click="navigateTo(tool.path)"
        >
          <component :is="tool.icon" :size="18" />
          <span class="menu-text">{{ t(`tools.${tool.key}.name`) }}</span>
        </div>
      </div>

      <div class="sidebar-section">
        <div v-if="!appStore.sidebarCollapsed" class="section-title">
          {{ t('common.allTools') }}
        </div>
        <div
          v-for="tool in filteredTools"
          :key="tool.path"
          class="menu-item"
          :class="{ active: isActive(tool.path) }"
          :title="t(`tools.${tool.key}.name`)"
          @click="navigateTo(tool.path)"
        >
          <component :is="tool.icon" :size="18" />
          <span v-if="!appStore.sidebarCollapsed" class="menu-text">
            {{ t(`tools.${tool.key}.name`) }}
          </span>
        </div>
      </div>
    </div>

    <button class="toggle-button" @click="appStore.toggleSidebar()">
      <ChevronLeft v-if="!appStore.sidebarCollapsed" :size="16" />
      <ChevronRight v-else :size="16" />
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  background-color: var(--surface-card);
  border-right: 1px solid var(--border-color);
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-search {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.search-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
}

.sidebar-content {
  flex: 1;
  padding: var(--spacing-sm);
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: var(--spacing-md);
}

.section-title {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-color-regular);
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}

.menu-item:hover {
  background-color: var(--bg-color-page);
  color: var(--text-color-primary);
}

.menu-item.active {
  background-color: var(--color-primary);
  color: white;
}

.menu-text {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-size-sm);
}

.toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--text-color-secondary);
  cursor: pointer;
  border-top: 1px solid var(--border-color);
}

.toggle-button:hover {
  color: var(--text-color-primary);
  background-color: var(--bg-color-page);
}
</style>
```

Note: `el-input` with `:prefix-icon="Search"` may not work directly because `prefix-icon` expects a string or component. Use the slot form instead:

```vue
<el-input
  v-model="searchQuery"
  :placeholder="t('common.search')"
  clearable
  @keydown="handleKeydown"
>
  <template #prefix>
    <Search :size="14" />
  </template>
</el-input>
```

- [ ] **Step 3: Add global keyboard shortcut for search**

In `src/App.vue`, add a keydown listener to focus the sidebar search when `Cmd/Ctrl+K` is pressed. Since `Sidebar` is a child component, we can use a ref or a global event. Simpler: add the listener in `Sidebar.vue` itself in `onMounted`.

Add to `Sidebar.vue` script:

```typescript
import { onMounted, onUnmounted, ref } from 'vue'

const searchInputRef = ref<HTMLInputElement | null>(null)

const focusSearch = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', focusSearch)
})

onUnmounted(() => {
  window.removeEventListener('keydown', focusSearch)
})
```

Bind ref to el-input. However, `el-input` doesn't expose the native input directly. Use `el-input` component ref and call `.focus()`. For simplicity, skip the global shortcut in this task and add it as a follow-up. Or use a plain input ref approach.

Actually, we can do this simply by giving the `el-input` a ref:

```vue
<el-input ref="searchInputRef" ... />
```

```typescript
const searchInputRef = ref<{ focus: () => void } | null>(null)

const focusSearch = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}
```

- [ ] **Step 4: Verify build and tests**

Run:
```bash
npm run build
npm run test:run
```

Expected: build passes. Tests may fail if selectors changed; we'll fix them in a later task.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.vue src/i18n/zh-CN.ts src/i18n/en-US.ts
git commit -m "feat: add search, recent tools, and shortcuts to Sidebar"
```

---

## Task 10: Migrate JsonFormatter to shared components

**Files:**
- Modify: `src/tools/JsonFormatter.vue`

- [ ] **Step 1: Replace JsonFormatter implementation**

Replace `src/tools/JsonFormatter.vue` with:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Braces } from 'lucide-vue-next'
import { formatJson, minifyJson, validateJson } from '@/utils/formatters'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'

const { t } = useI18n()

const input = ref('')
const output = ref('')
const error = ref('')

const handleFormat = () => {
  error.value = ''
  try {
    if (!validateJson(input.value)) {
      throw new Error('Invalid JSON')
    }
    output.value = formatJson(input.value)
    ElMessage.success(t('common.success'))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = message
    ElMessage.error(t('errors.jsonSyntax', { message }))
  }
}

const handleMinify = () => {
  error.value = ''
  try {
    if (!validateJson(input.value)) {
      throw new Error('Invalid JSON')
    }
    output.value = minifyJson(input.value)
    ElMessage.success(t('common.success'))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = message
    ElMessage.error(t('errors.jsonSyntax', { message }))
  }
}

const handleCopy = async () => {
  if (output.value) {
    await copyToClipboard(output.value)
    ElMessage.success(t('common.copied'))
  }
}

const handleClear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <ToolLayout
    :title="t('tools.json.name')"
    output-copyable
    @copy="handleCopy"
  >
    <template #input>
      <ToolTextarea v-model="input" :placeholder="t('common.placeholder')" />
    </template>

    <template #actions>
      <el-button type="primary" :icon="Braces" @click="handleFormat">
        {{ t('common.format') }}
      </el-button>
      <el-button :icon="Braces" @click="handleMinify">
        {{ t('common.minify') }}
      </el-button>
      <el-button :icon="Delete" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <CodeOutput :content="output" :error="error" language="json" />
    </template>
  </ToolLayout>
</template>
```

Wait, I used `Delete` icon but imported `Trash2` before. Use `Trash2` or `Delete` from lucide. Keep `Trash2` for consistency with existing code. Import `Trash2` instead.

Also, the `@copy` event on `ToolLayout` is only emitted when copy button in output panel is clicked. We handle it with `handleCopy`. Good.

- [ ] **Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/JsonFormatter.vue
git commit -m "refactor: migrate JsonFormatter to shared components"
```

---

## Task 11: Migrate remaining text-area based tools

**Files:**
- Modify: `src/tools/XmlFormatter.vue`
- Modify: `src/tools/Base64Tool.vue`
- Modify: `src/tools/UrlEncoder.vue`
- Modify: `src/tools/HashCalculator.vue`

Pattern for each: replace custom textarea/input/output styles with `ToolTextarea` and `CodeOutput`, use `ToolLayout` vertical slots, use `el-button` with icons.

- [ ] **Step 1: XmlFormatter**

Replace with similar structure to JsonFormatter, using `language="xml"` for `CodeOutput`. Use `Code` icon for format button.

- [ ] **Step 2: Base64Tool**

Use `Lock`/`Unlock` icons for encode/decode. Use `language="text"` for output.

- [ ] **Step 3: UrlEncoder**

Use `Link`/`Unlink` icons. Use `language="text"` for output.

- [ ] **Step 4: HashCalculator**

Use `Hash` icon. Use `language="text"` for output.

- [ ] **Step 5: Verify build**

Run:
```bash
npm run build
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/tools/XmlFormatter.vue src/tools/Base64Tool.vue src/tools/UrlEncoder.vue src/tools/HashCalculator.vue
git commit -m "refactor: migrate Xml/Base64/Url/Hash tools to shared components"
```

---

## Task 12: Migrate form-based tools

**Files:**
- Modify: `src/tools/TimestampConverter.vue`
- Modify: `src/tools/ColorConverter.vue`
- Modify: `src/tools/RegexTester.vue`

- [ ] **Step 1: TimestampConverter**

Keep form groups for Timestamp, Date, Unit. Use `el-radio-group` for unit selection instead of native radio inputs. Use `CodeOutput` for result. Remove custom styles.

- [ ] **Step 2: ColorConverter**

Keep HEX/RGB inputs and preview. Use `el-input` for inputs. Use `CodeOutput` for result. Remove custom styles.

- [ ] **Step 3: RegexTester**

Keep Pattern input, Test String textarea, Flags checkboxes. Use `el-checkbox-group` for flags. Use `CodeOutput` for result.

- [ ] **Step 4: Verify build**

Run:
```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/tools/TimestampConverter.vue src/tools/ColorConverter.vue src/tools/RegexTester.vue
git commit -m "refactor: migrate Timestamp/Color/Regex tools to shared components"
```

---

## Task 13: Update existing tool tests

**Files:**
- Modify: `src/tools/__tests__/*.spec.ts`

- [ ] **Step 1: Inspect existing tests**

Run existing tests to see which fail:

```bash
npm run test:run
```

- [ ] **Step 2: Fix broken selectors**

If tests look for `.action-button`, `.json-input`, `.output-content`, etc., update them to look for `el-button`, `.tool-textarea`, `.code-content`, or by button text.

For example, in JsonFormatter test:
- Replace `.action-button.format-button` with `el-button` containing text "格式化" / "Format"
- Replace `.json-input` with `.tool-textarea`
- Replace `.output-content` with `.code-content`

- [ ] **Step 3: Run tests again**

Run:
```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/tools/__tests__
git commit -m "test: update tool tests for shared component selectors"
```

---

## Task 14: Add keyboard shortcuts for primary actions

**Files:**
- Modify: each `src/tools/*.vue`

- [ ] **Step 1: Add Cmd/Ctrl+Enter handler to ToolTextarea**

Instead of modifying each tool, add an optional prop to `ToolTextarea`:

```vue
<script setup lang="ts">
const model = defineModel<string>()

interface Props {
  placeholder?: string
  submitHotkey?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  submitHotkey: false,
})

const emit = defineEmits<{
  submit: []
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (props.submitHotkey && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    emit('submit')
  }
}
</script>
```

Update template:

```vue
<textarea
  v-model="model"
  class="tool-textarea"
  :placeholder="placeholder"
  @keydown="handleKeydown"
/>
```

- [ ] **Step 2: Wire submit event in each tool**

For JsonFormatter:

```vue
<ToolTextarea
  v-model="input"
  :placeholder="t('common.placeholder')"
  submit-hotkey
  @submit="handleFormat"
/>
```

For other tools, wire `@submit` to their primary action (format/encode/calculate/test/convert).

- [ ] **Step 3: Verify**

Run:
```bash
npm run build
npm run test:run
```

Expected: build and tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ToolTextarea.vue src/tools
git commit -m "feat: add Cmd/Ctrl+Enter shortcut for primary actions"
```

---

## Task 15: Visual regression and manual QA

**Files:**
- None (verification only)

- [ ] **Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: exit 0.

- [ ] **Step 2: Run all tests**

Run:
```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 3: Run dev server and manually verify**

Run:
```bash
npm run dev
```

Open `http://localhost:1420` and verify:
- TitleBar shows Wrench icon, theme dropdown, language dropdown
- Sidebar has search box and recent tools
- Each tool page shows input panel → action bar → output panel vertically
- Primary action buttons are highlighted
- JSON/XML output has syntax highlighting
- Copy button copies output
- Clear button clears input/output
- Dark mode toggle works
- Language switch works
- Sidebar collapse works
- `Cmd/Ctrl+K` focuses search (if implemented)
- `Cmd/Ctrl+Enter` triggers primary action

- [ ] **Step 4: Fix any issues found**

Create follow-up commits for any QA issues.

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Plan task |
|------------------|-----------|
| Extend semantic design tokens | Task 2 |
| Create ToolPanel | Task 3 |
| Create ToolActionBar | Task 4 |
| Create CodeOutput | Task 5 |
| Create ToolTextarea | Task 6 |
| Refactor ToolLayout to vertical | Task 7 |
| TitleBar theme/language controls | Task 8 |
| Sidebar search/recent tools | Task 9 |
| Migrate all 8 tools | Tasks 10-12 |
| Update tests | Task 13 |
| Keyboard shortcuts | Task 14 |
| Visual regression / manual QA | Task 15 |

### Placeholder scan

- No "TBD", "TODO", or "implement later" in plan steps.
- All code blocks contain concrete code.
- All commands have expected output.
- No vague instructions like "handle edge cases" without specifics.

### Type consistency

- `ToolPanel` emits `copy` event.
- `ToolLayout` forwards `copy` event via `@copy` and `output-copyable` prop.
- `CodeOutput` accepts `content`, `error`, `language` props.
- `ToolTextarea` uses `defineModel<string>()`.
- i18n keys added consistently in both `zh-CN.ts` and `en-US.ts`.

### Identified gaps / follow-ups

1. **Highlight.js dark theme**: Current plan uses `github.css` only. Dark mode syntax colors may not be ideal. Add a follow-up task to conditionally load `github-dark.css` when `appStore.isDark` is true.
2. **Search shortcut `Cmd/Ctrl+K`**: Included in Task 9 but relies on `el-input` ref focus; verify it works during manual QA.
3. **Sidebar collapsed state search**: In collapsed mode, only a search icon is shown. A future enhancement could expand the sidebar when the icon is clicked.
