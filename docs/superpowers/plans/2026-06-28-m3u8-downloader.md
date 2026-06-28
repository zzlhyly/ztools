# M3U8 视频下载器 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an M3U8 video download tool that accepts a webpage URL (or direct m3u8 URL), extracts/downloads/decrypts TS segments, and converts them to MP4 via ffmpeg.

**Architecture:** Vue 3 frontend (Pinia store + component) communicates with Rust backend via Tauri invoke/event. Rust handles all IO: HTTP fetching (reqwest), M3U8 parsing, AES-128-CBC decryption, segment download, and ffmpeg conversion. Progress is streamed via Tauri events.

**Tech Stack:** Vue 3 + TypeScript + Pinia (frontend), Rust + reqwest + aes/cbc + scraper + tokio (backend), ffmpeg (external, user-installed).

## Global Constraints

- Tauri v2 app, frontend at `src/`, backend at `src-tauri/`
- TypeScript strict mode: `noUnusedLocals: true`, `noUnusedParameters: true`
- Vue 3 SFC with `<script setup lang="ts">`
- Element Plus auto-imported (no manual imports needed), except `ElMessage` must be explicitly imported
- Vitest + jsdom for frontend tests, globals enabled
- Test files co-located in `__tests__/` directories
- Pinia store with Composition API (`defineStore('name', () => { ... })`)
- Hash-based routing (`createWebHashHistory`), path alias `@/` → `src/`
- Rust edition 2021, crate name `ztools_lib`, Tauri commands with `#[tauri::command]`
- ffmpeg is NOT bundled — user installs independently, path configurable in UI

---

### Task 1: Define TypeScript types in store file

**Files:**
- Create: `src/stores/m3u8.ts` (types only, no store yet)

**Interfaces:**
- Produces: `M3u8InputMode`, `M3u8TaskStatus`, `M3u8Task`, `M3u8Config`, `M3u8QualityOption`, `ProgressEvent`

- [ ] **Step 1: Write the file**

Create `src/stores/m3u8.ts` with ONLY the type definitions (store implementation comes in Task 2):

```typescript
// Type definitions for M3U8 downloader

export type M3u8InputMode = 'webpage' | 'direct'

export type M3u8TaskStatus =
  | 'parsing'
  | 'selecting_quality'
  | 'downloading'
  | 'converting'
  | 'done'
  | 'error'
  | 'cancelled'

export interface M3u8QualityOption {
  bandwidth: number
  resolution: string
  url: string
}

export interface M3u8Task {
  id: string
  url: string
  inputMode: M3u8InputMode
  m3u8Url: string
  title: string
  quality: string
  filename: string
  status: M3u8TaskStatus
  progress: number
  speed: string
  downloaded: number
  total: number
  error?: string
  createdAt: number
  completedAt?: number
  qualityOptions?: M3u8QualityOption[]
}

export interface M3u8Config {
  downloadDir: string
  ffmpegPath: string
  headers: {
    referer: string
    cookie: string
    custom: Array<{ key: string; value: string }>
  }
  maxTaskConcurrent: number
  maxSegmentConcurrent: number
}

export interface ProgressEvent {
  task_id: string
  percent: number
  speed: string
  downloaded: number
  total: number
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx vue-tsc --noEmit src/stores/m3u8.ts`
Expected: No errors (may report unused type exports — acceptable, they will be consumed in later tasks).

- [ ] **Step 3: Commit**

```bash
git add src/stores/m3u8.ts
git commit -m "feat: add M3U8 TypeScript type definitions"
```

---

### Task 2: Create Pinia store with tests

**Files:**
- Create: `src/stores/__tests__/m3u8.test.ts`
- Modify: `src/stores/m3u8.ts` (add store implementation below types)

**Interfaces:**
- Consumes: `M3u8Task`, `M3u8Config`, `M3u8TaskStatus`, `M3u8InputMode` (from Task 1)
- Produces: `useM3u8Store()` → `{ config, tasks, addTask, updateTask, removeTask, cancelTask, retryTask, updateConfig }`

- [ ] **Step 1: Write the failing test**

Create `src/stores/__tests__/m3u8.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useM3u8Store } from '../m3u8'
import type { M3u8Task } from '../m3u8'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('M3U8 Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Config', () => {
    it('should have default config values', () => {
      const store = useM3u8Store()
      expect(store.config.downloadDir).toBe('')
      expect(store.config.ffmpegPath).toBe('ffmpeg')
      expect(store.config.maxTaskConcurrent).toBe(1)
      expect(store.config.maxSegmentConcurrent).toBe(5)
      expect(store.config.headers.referer).toBe('')
      expect(store.config.headers.cookie).toBe('')
      expect(store.config.headers.custom).toEqual([])
    })

    it('should update config and persist to localStorage', () => {
      const store = useM3u8Store()
      store.updateConfig({ downloadDir: '/downloads' })
      expect(store.config.downloadDir).toBe('/downloads')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should load config from localStorage on init', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ downloadDir: '/custom', ffmpegPath: '/usr/bin/ffmpeg' })
      )
      // Re-create store with localStorage already set
      const store = useM3u8Store()
      expect(store.config.downloadDir).toBe('/custom')
      expect(store.config.ffmpegPath).toBe('/usr/bin/ffmpeg')
    })
  })

  describe('Tasks', () => {
    it('should add a task and return it', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      expect(task.id).toBeTruthy()
      expect(task.url).toBe('https://example.com/video')
      expect(task.status).toBe('parsing')
      expect(store.tasks).toHaveLength(1)
    })

    it('should update a task status and progress', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, {
        status: 'downloading',
        progress: 50,
        speed: '2.0 MB/s',
        downloaded: 100,
        total: 200,
      })
      const updated = store.tasks.find(t => t.id === task.id)!
      expect(updated.status).toBe('downloading')
      expect(updated.progress).toBe(50)
      expect(updated.speed).toBe('2.0 MB/s')
      expect(updated.downloaded).toBe(100)
      expect(updated.total).toBe(200)
    })

    it('should remove a task', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      expect(store.tasks).toHaveLength(1)
      store.removeTask(task.id)
      expect(store.tasks).toHaveLength(0)
    })

    it('should mark task as cancelled', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, { status: 'downloading' })
      store.cancelTask(task.id)
      const cancelled = store.tasks.find(t => t.id === task.id)!
      expect(cancelled.status).toBe('cancelled')
    })

    it('should mark task as done with completedAt', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, {
        status: 'done',
        progress: 100,
        completedAt: Date.now(),
      })
      const done = store.tasks.find(t => t.id === task.id)!
      expect(done.status).toBe('done')
      expect(done.completedAt).toBeGreaterThan(0)
    })

    it('should persist tasks to localStorage', () => {
      const store = useM3u8Store()
      store.addTask('https://example.com/video', 'direct')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'm3u8_tasks',
        expect.any(String)
      )
    })

    it('should persist task history (keep completed tasks)', () => {
      const store = useM3u8Store()
      const task1 = store.addTask('https://a.com/v1', 'direct')
      const task2 = store.addTask('https://a.com/v2', 'webpage')
      store.updateTask(task1.id, { status: 'done', progress: 100, completedAt: Date.now() })
      store.updateTask(task2.id, { status: 'done', progress: 100, completedAt: Date.now() })
      expect(store.tasks).toHaveLength(2)
    })

    it('should have active downloading tasks count', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, { status: 'downloading' })
      const active = store.tasks.filter(
        t => t.status === 'downloading' || t.status === 'converting'
      )
      expect(active).toHaveLength(1)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/__tests__/m3u8.test.ts`
Expected: FAIL — `useM3u8Store is not a function` or similar

- [ ] **Step 3: Implement the store**

Replace the content of `src/stores/m3u8.ts` (keep the type definitions from Task 1, APPEND the store below):

```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { M3u8Task, M3u8Config, M3u8InputMode, M3u8TaskStatus, M3u8QualityOption } from './m3u8'

// --- Type re-exports (Task 1 types kept above this line) ---
// The types from Task 1 remain at the top of the file.
// Add the store below them.

function defaultConfig(): M3u8Config {
  return {
    downloadDir: '',
    ffmpegPath: 'ffmpeg',
    headers: {
      referer: '',
      cookie: '',
      custom: [],
    },
    maxTaskConcurrent: 1,
    maxSegmentConcurrent: 5,
  }
}

function loadConfig(): M3u8Config {
  try {
    const raw = localStorage.getItem('m3u8_config')
    if (raw) {
      return { ...defaultConfig(), ...JSON.parse(raw) }
    }
  } catch { /* ignore parse errors */ }
  return defaultConfig()
}

function loadTasks(): M3u8Task[] {
  try {
    const raw = localStorage.getItem('m3u8_tasks')
    if (raw) {
      return JSON.parse(raw)
    }
  } catch { /* ignore parse errors */ }
  return []
}

let taskIdCounter = 0

function generateId(): string {
  taskIdCounter++
  return `m3u8_${Date.now()}_${taskIdCounter}`
}

export const useM3u8Store = defineStore('m3u8', () => {
  const config = ref<M3u8Config>(loadConfig())
  const tasks = ref<M3u8Task[]>(loadTasks())

  // Persist tasks on every change
  watch(tasks, (val) => {
    localStorage.setItem('m3u8_tasks', JSON.stringify(val))
  }, { deep: true })

  // Persist config on every change
  watch(config, (val) => {
    localStorage.setItem('m3u8_config', JSON.stringify(val))
  }, { deep: true })

  function updateConfig(partial: Partial<M3u8Config>) {
    config.value = { ...config.value, ...partial }
  }

  function addTask(url: string, inputMode: M3u8InputMode): M3u8Task {
    const task: M3u8Task = {
      id: generateId(),
      url,
      inputMode,
      m3u8Url: '',
      title: '',
      quality: 'auto',
      filename: '',
      status: 'parsing',
      progress: 0,
      speed: '',
      downloaded: 0,
      total: 0,
      createdAt: Date.now(),
    }
    tasks.value.push(task)
    return task
  }

  function updateTask(taskId: string, patch: Partial<M3u8Task>) {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...patch }
    }
  }

  function removeTask(taskId: string) {
    tasks.value = tasks.value.filter(t => t.id !== taskId)
  }

  function cancelTask(taskId: string) {
    updateTask(taskId, { status: 'cancelled' })
  }

  function retryTask(taskId: string) {
    updateTask(taskId, {
      status: 'parsing',
      progress: 0,
      speed: '',
      error: undefined,
    })
  }

  return {
    config,
    tasks,
    updateConfig,
    addTask,
    updateTask,
    removeTask,
    cancelTask,
    retryTask,
  }
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/stores/__tests__/m3u8.test.ts`
Expected: All 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/m3u8.ts src/stores/__tests__/m3u8.test.ts
git commit -m "feat: add M3U8 Pinia store with tests"
```

---

### Task 3: cURL parser utility with tests

**Files:**
- Create: `src/utils/__tests__/m3u8.test.ts`
- Create: `src/utils/m3u8.ts`

**Interfaces:**
- Produces: `parseCurlCommand(curlString: string) → { url: string, headers: Record<string, string> } | null`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/m3u8.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseCurlCommand } from '../m3u8'

describe('parseCurlCommand', () => {
  it('should extract URL from a simple curl command', () => {
    const result = parseCurlCommand(`curl 'https://example.com/video.m3u8'`)
    expect(result).not.toBeNull()
    expect(result!.url).toBe('https://example.com/video.m3u8')
    expect(result!.headers).toEqual({})
  })

  it('should extract URL with double quotes', () => {
    const result = parseCurlCommand(`curl "https://example.com/video.m3u8"`)
    expect(result!.url).toBe('https://example.com/video.m3u8')
  })

  it('should extract URL without quotes', () => {
    const result = parseCurlCommand(`curl https://example.com/video.m3u8`)
    expect(result!.url).toBe('https://example.com/video.m3u8')
  })

  it('should extract -H headers', () => {
    const curl = [
      `curl 'https://example.com/video.m3u8'`,
      `-H 'Referer: https://example.com/'`,
      `-H 'Cookie: session=abc123'`,
    ].join(' \\\n')
    const result = parseCurlCommand(curl)
    expect(result).not.toBeNull()
    expect(result!.headers).toEqual({
      Referer: 'https://example.com/',
      Cookie: 'session=abc123',
    })
  })

  it('should extract --header headers', () => {
    const curl = [
      `curl "https://example.com/video.m3u8"`,
      `--header "User-Agent: Mozilla/5.0"`,
    ].join(' \\\n')
    const result = parseCurlCommand(curl)
    expect(result!.headers).toEqual({
      'User-Agent': 'Mozilla/5.0',
    })
  })

  it('should return null for non-curl input', () => {
    const result = parseCurlCommand('just a regular URL')
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = parseCurlCommand('')
    expect(result).toBeNull()
  })

  it('should handle mixed quote styles', () => {
    const curl = [
      `curl 'https://example.com/video.m3u8'`,
      `-H "Referer: https://example.com/"`,
      `-H 'Cookie: session=abc'`,
    ].join(' \\\n')
    const result = parseCurlCommand(curl)
    expect(result!.url).toBe('https://example.com/video.m3u8')
    expect(result!.headers).toEqual({
      Referer: 'https://example.com/',
      Cookie: 'session=abc',
    })
  })

  it('should handle multiline curl without backslashes', () => {
    const curl = `curl 'https://example.com/video.m3u8' -H 'Referer: https://example.com/' -H 'Cookie: x=1'`
    const result = parseCurlCommand(curl)
    expect(result!.headers).toEqual({
      Referer: 'https://example.com/',
      Cookie: 'x=1',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/m3u8.test.ts`
Expected: FAIL — module not found or function not defined

- [ ] **Step 3: Implement parseCurlCommand**

Create `src/utils/m3u8.ts`:

```typescript
/**
 * Parse a cURL command string into URL and headers.
 * Returns null if the input is not a cURL command.
 */
export function parseCurlCommand(
  curlString: string,
): { url: string; headers: Record<string, string> } | null {
  const trimmed = curlString.trim()
  if (!trimmed.startsWith('curl ')) return null

  // Extract URL — matches the first unquoted, single-quoted, or double-quoted URL after "curl "
  const urlMatch = trimmed.match(
    /curl\s+(?:--\S+\s+)*(?:'([^']+)'|"([^"]+)"|(\S+))/,
  )
  if (!urlMatch) return null
  const url = urlMatch[1] || urlMatch[2] || urlMatch[3]
  if (!url || !url.startsWith('http')) return null

  // Extract headers (-H 'Key: Value' or --header 'Key: Value')
  const headers: Record<string, string> = {}
  const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)")/g
  let match: RegExpExecArray | null
  while ((match = headerRegex.exec(trimmed)) !== null) {
    const headerStr = match[1] || match[2]
    const colonIndex = headerStr.indexOf(':')
    if (colonIndex > 0) {
      const key = headerStr.substring(0, colonIndex).trim()
      const value = headerStr.substring(colonIndex + 1).trim()
      headers[key] = value
    }
  }

  return { url, headers }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/__tests__/m3u8.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/m3u8.ts src/utils/__tests__/m3u8.test.ts
git commit -m "feat: add cURL parser utility with tests"
```

---

### Task 4: Tauri invoke/event wrappers in utils

**Files:**
- Modify: `src/utils/m3u8.ts` (append below cURL parser)

**Interfaces:**
- Produces: `invokeFetchPage(url, headers) → Promise<{html, final_url}>`, `invokeParseM3u8(url, headers) → Promise<PlaylistInfo>`, `invokeStartDownload(config) → Promise<string>`, `invokeCancelDownload(taskId) → Promise<void>`, `onDownloadProgress(callback) → Promise<() => void>`

**Note:** These wrappers use `@tauri-apps/api` (already a project dependency). They will be called in Task 7 but defined here so they can be tested/verified independently.

- [ ] **Step 1: Append invoke wrappers to utils**

Append to `src/utils/m3u8.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { ProgressEvent, M3u8QualityOption } from '@/stores/m3u8'

// ---- Tauri command wrappers ----

export interface FetchPageResult {
  html: string
  final_url: string
}

export async function invokeFetchPage(
  url: string,
  headers: Record<string, string>,
): Promise<FetchPageResult> {
  return invoke<FetchPageResult>('fetch_page', { url, headers })
}

export interface M3u8Info {
  url: string
  label: string
  qualities: M3u8QualityOption[]
}

export async function invokeParseM3u8Urls(
  html: string,
  baseUrl: string,
): Promise<M3u8Info[]> {
  return invoke<M3u8Info[]>('parse_m3u8_urls', { html, baseUrl })
}

export interface ParseM3u8Result {
  playlist_type: 'master' | 'media'
  qualities: M3u8QualityOption[]
  segment_count: number
  has_encryption: boolean
}

export async function invokeParseM3u8(
  url: string,
  headers: Record<string, string>,
): Promise<ParseM3u8Result> {
  return invoke<ParseM3u8Result>('parse_m3u8', { url, headers })
}

export interface DownloadConfig {
  task_id: string
  m3u8_url: string
  output_dir: string
  filename: string
  headers: Record<string, string>
  ffmpeg_path: string
  max_segment_concurrent: number
}

export async function invokeStartDownload(config: DownloadConfig): Promise<string> {
  return invoke<string>('start_download', { config })
}

export async function invokeCancelDownload(taskId: string): Promise<void> {
  return invoke('cancel_download', { taskId })
}

export async function invokeCheckFfmpeg(ffmpegPath: string): Promise<boolean> {
  return invoke<boolean>('check_ffmpeg', { ffmpegPath })
}

// ---- Event listeners ----

export async function onDownloadProgress(
  callback: (event: ProgressEvent) => void,
): Promise<UnlistenFn> {
  return listen<ProgressEvent>('download-progress', (event) => {
    callback(event.payload)
  })
}

export interface DownloadCompleteEvent {
  task_id: string
  output_path: string
}

export async function onDownloadComplete(
  callback: (event: DownloadCompleteEvent) => void,
): Promise<UnlistenFn> {
  return listen<DownloadCompleteEvent>('download-complete', (event) => {
    callback(event.payload)
  })
}

export interface DownloadErrorEvent {
  task_id: string
  error: string
}

export async function onDownloadError(
  callback: (event: DownloadErrorEvent) => void,
): Promise<UnlistenFn> {
  return listen<DownloadErrorEvent>('download-error', (event) => {
    callback(event.payload)
  })
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx vue-tsc --noEmit`
Expected: No new errors (existing `vite.config.ts` / `vitest.config.ts` LSP warnings are pre-existing and can be ignored).

- [ ] **Step 3: Commit**

```bash
git add src/utils/m3u8.ts
git commit -m "feat: add M3U8 Tauri invoke/event wrappers"
```

---

### Task 5: DownloadProgress component with tests

**Files:**
- Create: `src/components/DownloadProgress.vue`
- Create: `src/components/__tests__/DownloadProgress.test.ts`

**Interfaces:**
- Produces: `<DownloadProgress :progress="0-100" :speed="string" :downloaded="number" :total="number" :status="string" />`
- Props: `progress: number`, `speed: string`, `downloaded: number`, `total: number`, `status: string`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/DownloadProgress.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DownloadProgress from '../DownloadProgress.vue'

describe('DownloadProgress', () => {
  it('should render progress bar with percentage', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 45,
        speed: '2.0 MB/s',
        downloaded: 90,
        total: 200,
        status: 'downloading',
      },
    })
    expect(wrapper.text()).toContain('45')
    expect(wrapper.text()).toContain('2.0 MB/s')
  })

  it('should show 0% for zero progress', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 0,
        speed: '',
        downloaded: 0,
        total: 100,
        status: 'parsing',
      },
    })
    expect(wrapper.text()).toContain('0')
  })

  it('should show 100% for complete', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 100,
        speed: '',
        downloaded: 100,
        total: 100,
        status: 'done',
      },
    })
    expect(wrapper.text()).toContain('100')
  })

  it('should show "—" speed when empty', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 10,
        speed: '',
        downloaded: 10,
        total: 100,
        status: 'downloading',
      },
    })
    expect(wrapper.text()).toContain('—')
  })

  it('should show error message when status is error', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 30,
        speed: '',
        downloaded: 30,
        total: 100,
        status: 'error',
      },
    })
    // The progress component should still render, error state is handled by parent
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/DownloadProgress.test.ts`
Expected: FAIL — component not found

- [ ] **Step 3: Implement the component**

Create `src/components/DownloadProgress.vue`:

```vue
<script setup lang="ts">
interface Props {
  progress: number
  speed: string
  downloaded: number
  total: number
  status: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="download-progress">
    <div class="progress-header">
      <span class="progress-percent">{{ props.progress }}%</span>
      <span class="progress-speed">{{ props.speed || '—' }}</span>
      <span class="progress-count">{{ props.downloaded }} / {{ props.total }}</span>
    </div>
    <div class="progress-bar-track" role="progressbar">
      <div
        class="progress-bar-fill"
        :style="{ width: props.progress + '%' }"
        :class="{ 'is-complete': props.status === 'done', 'is-error': props.status === 'error' }"
      />
    </div>
  </div>
</template>

<style scoped>
.download-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
}

.progress-percent {
  font-weight: 600;
  min-width: 36px;
}

.progress-bar-track {
  height: 6px;
  background-color: var(--bg-color-page, #f5f7fa);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--color-primary, #409eff);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar-fill.is-complete {
  background-color: var(--color-success, #67c23a);
}

.progress-bar-fill.is-error {
  background-color: var(--color-danger, #f56c6c);
}
</style>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/DownloadProgress.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DownloadProgress.vue src/components/__tests__/DownloadProgress.test.ts
git commit -m "feat: add DownloadProgress component with tests"
```

---

### Task 6: i18n translations

**Files:**
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en-US.ts`

**Interfaces:** None (adds translation keys consumed by Task 7)

- [ ] **Step 1: Add Chinese translations**

Edit `src/i18n/zh-CN.ts`. Find the `tools: {` section and add `m3u8:` entry AFTER the last existing tool entry (after `hash:`). Also add new common keys:

```typescript
// In tools section, add after hash:
    m3u8: {
      name: 'M3U8 下载器',
      description: '下载 M3U8 视频并转换为 MP4',
    },
```

Add these keys to the `common:` section:

```typescript
// In common section, add:
    download: '下载',
    downloading: '下载中',
    converting: '转换中',
    parsing: '解析中',
    done: '完成',
    cancelled: '已取消',
    paused: '已暂停',
    retry: '重试',
    cancel: '取消',
    webpageUrl: '网页 URL',
    m3u8Url: 'M3U8 URL',
    directM3u8Url: '直接 M3U8 链接',
    downloadDir: '下载目录',
    headers: '请求头',
    ffmpegPath: 'FFmpeg 路径',
    curlPaste: '从 cURL 粘贴',
    noM3u8Found: '未检测到视频资源，请尝试直接粘贴 M3U8 链接',
    encNotSupported: '加密方式不受支持：{method}',
    ffmpegNotFound: '未找到 FFmpeg，请安装后配置路径',
    liveNotSupported: '不支持直播流',
    addTask: '添加任务',
    quality: '清晰度',
    selectQuality: '选择清晰度',
    confirmCancel: '确定要取消此下载吗？',
    confirmExit: '还有 {count} 个下载任务正在进行，确定退出吗？',
    activeDownloads: '进行中',
    history: '历史记录',
```

- [ ] **Step 2: Add English translations**

Edit `src/i18n/en-US.ts`. Add the same keys with English values:

```typescript
// In tools section, add after hash:
    m3u8: {
      name: 'M3U8 Downloader',
      description: 'Download M3U8 videos and convert to MP4',
    },
```

```typescript
// In common section, add:
    download: 'Download',
    downloading: 'Downloading',
    converting: 'Converting',
    parsing: 'Parsing',
    done: 'Done',
    cancelled: 'Cancelled',
    paused: 'Paused',
    retry: 'Retry',
    cancel: 'Cancel',
    webpageUrl: 'Webpage URL',
    m3u8Url: 'M3U8 URL',
    directM3u8Url: 'Direct M3U8 URL',
    downloadDir: 'Download Directory',
    headers: 'Headers',
    ffmpegPath: 'FFmpeg Path',
    curlPaste: 'Paste from cURL',
    noM3u8Found: 'No video resource detected. Try pasting a direct M3U8 URL.',
    encNotSupported: 'Encryption method not supported: {method}',
    ffmpegNotFound: 'FFmpeg not found. Please install and configure the path.',
    liveNotSupported: 'Live streams are not supported.',
    addTask: 'Add Task',
    quality: 'Quality',
    selectQuality: 'Select Quality',
    confirmCancel: 'Are you sure you want to cancel this download?',
    confirmExit: '{count} download(s) in progress. Are you sure you want to exit?',
    activeDownloads: 'Active',
    history: 'History',
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx vue-tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/i18n/zh-CN.ts src/i18n/en-US.ts
git commit -m "feat: add M3U8 i18n translations (zh-CN + en-US)"
```

---

### Task 7: M3u8Downloader tool page

**Files:**
- Create: `src/tools/M3u8Downloader.vue`

**Interfaces:**
- Consumes: `useM3u8Store` (Task 2), `parseCurlCommand` (Task 3), invoke wrappers (Task 4), `DownloadProgress` component (Task 5), i18n keys (Task 6)
- Produces: Full tool page component

- [ ] **Step 1: Write the component**

Create `src/tools/M3u8Downloader.vue`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useM3u8Store, type M3u8Task } from '@/stores/m3u8'
import { parseCurlCommand } from '@/utils/m3u8'
import {
  invokeFetchPage,
  invokeParseM3u8Urls,
  invokeParseM3u8,
  invokeStartDownload,
  invokeCancelDownload,
  invokeCheckFfmpeg,
  onDownloadProgress,
  onDownloadComplete,
  onDownloadError,
  type M3u8Info,
  type DownloadConfig,
} from '@/utils/m3u8'
import DownloadProgress from '@/components/DownloadProgress.vue'
import { Download, Trash2, RotateCcw, X, Upload, FolderOpen } from 'lucide-vue-next'

const { t } = useI18n()
const store = useM3u8Store()

// Input state
const urlInput = ref('')
const curlInput = ref('')
const showCurlInput = ref(false)
const showHeadersConfig = ref(false)
const showQualitySelect = ref(false)
const selectedQuality = ref('')
const qualityOptions = ref<M3u8Info[]>([]) // m3u8 options from parsing
const selectedM3u8Url = ref('')

// Computed
const activeTasks = computed(() =>
  store.tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'converting' || t.status === 'parsing',
  ),
)

const completedTasks = computed(() =>
  store.tasks.filter((t) => t.status === 'done' || t.status === 'error' || t.status === 'cancelled'),
)

// Event listeners
let unlistenProgress: (() => void) | null = null
let unlistenComplete: (() => void) | null = null
let unlistenError: (() => void) | null = null

onMounted(async () => {
  unlistenProgress = await onDownloadProgress((event) => {
    store.updateTask(event.task_id, {
      progress: event.percent,
      speed: event.speed,
      downloaded: event.downloaded,
      total: event.total,
      status: 'downloading',
    })
  })
  unlistenComplete = await onDownloadComplete((event) => {
    store.updateTask(event.task_id, {
      status: 'done',
      progress: 100,
      completedAt: Date.now(),
    })
    ElMessage.success(t('common.done'))
  })
  unlistenError = await onDownloadError((event) => {
    store.updateTask(event.task_id, {
      status: 'error',
      error: event.error,
    })
    ElMessage.error(event.error)
  })
})

onUnmounted(() => {
  unlistenProgress?.()
  unlistenComplete?.()
  unlistenError?.()
})

// Determine if input looks like a direct URL or webpage
function isDirectUrl(url: string): boolean {
  return url.endsWith('.m3u8') || url.includes('.m3u8?')
}

// Build headers record from store config
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const h = store.config.headers
  if (h.referer) headers['Referer'] = h.referer
  if (h.cookie) headers['Cookie'] = h.cookie
  for (const item of h.custom) {
    if (item.key) headers[item.key] = item.value
  }
  return headers
}

// Handle curl paste
function handleCurlPaste() {
  const result = parseCurlCommand(curlInput.value)
  if (!result) {
    ElMessage.error('Invalid cURL command')
    return
  }
  urlInput.value = result.url
  // Apply extracted headers to config
  if (result.headers['Referer']) {
    store.updateConfig({
      headers: { ...store.config.headers, referer: result.headers['Referer'] },
    })
  }
  if (result.headers['Cookie']) {
    store.updateConfig({
      headers: { ...store.config.headers, cookie: result.headers['Cookie'] },
    })
  }
  // Other headers go to custom
  const customHeaders = Object.entries(result.headers)
    .filter(([k]) => k !== 'Referer' && k !== 'Cookie')
    .map(([key, value]) => ({ key, value }))
  if (customHeaders.length > 0) {
    store.updateConfig({ headers: { ...store.config.headers, custom: customHeaders } })
  }
  ElMessage.success('Headers extracted from cURL')
}

// Main flow: add and start download
async function handleAddTask() {
  const url = urlInput.value.trim()
  if (!url) return

  const inputMode = isDirectUrl(url) ? 'direct' : 'webpage'
  const headers = buildHeaders()

  if (inputMode === 'direct') {
    // Direct M3U8 URL — parse immediately and start
    await startFromDirectUrl(url, headers)
  } else {
    // Webpage URL — fetch page, extract M3U8
    await startFromWebpage(url, headers)
  }
}

async function startFromDirectUrl(url: string, headers: Record<string, string>) {
  // Check ffmpeg
  const hasFfmpeg = await invokeCheckFfmpeg(store.config.ffmpegPath)
  if (!hasFfmpeg) {
    ElMessage.error(t('common.ffmpegNotFound'))
    return
  }

  const task = store.addTask(url, 'direct')
  task.m3u8Url = url

  try {
    const result = await invokeParseM3u8(url, headers)
    if (result.playlist_type === 'master' && result.qualities.length > 1) {
      // Show quality selection
      store.updateTask(task.id, {
        status: 'selecting_quality',
        qualityOptions: result.qualities,
      })
      selectedM3u8Url.value = url
      qualityOptions.value = [{ url, label: 'Master Playlist', qualities: result.qualities }]
      showQualitySelect.value = true
      return
    }

    // Proceed to download
    await doStartDownload(task, url, store.config.downloadDir)
  } catch (err: any) {
    store.updateTask(task.id, { status: 'error', error: String(err) })
    ElMessage.error(String(err))
  }
}

async function startFromWebpage(url: string, headers: Record<string, string>) {
  const task = store.addTask(url, 'webpage')

  try {
    // Step 1: Fetch page
    store.updateTask(task.id, { status: 'parsing' })
    const pageResult = await invokeFetchPage(url, headers)

    // Step 2: Extract M3U8 URLs
    const m3u8List = await invokeParseM3u8Urls(pageResult.html, pageResult.final_url)

    if (m3u8List.length === 0) {
      store.updateTask(task.id, {
        status: 'error',
        error: t('common.noM3u8Found'),
      })
      ElMessage.warning(t('common.noM3u8Found'))
      return
    }

    // Step 3: Parse first M3U8 for quality info
    const firstM3u8 = m3u8List[0]
    const playlist = await invokeParseM3u8(firstM3u8.url, headers)

    if (playlist.playlist_type === 'master' && playlist.qualities.length > 1) {
      store.updateTask(task.id, {
        status: 'selecting_quality',
        m3u8Url: firstM3u8.url,
        qualityOptions: playlist.qualities,
      })
      qualityOptions.value = m3u8List
      selectedM3u8Url.value = firstM3u8.url
      showQualitySelect.value = true
      return
    }

    // Single quality — proceed
    store.updateTask(task.id, {
      m3u8Url: firstM3u8.url,
      title: firstM3u8.label || extractFilename(url),
      quality: firstM3u8.qualities[0]?.resolution || 'auto',
    })

    await doStartDownload(task, firstM3u8.url, store.config.downloadDir)
  } catch (err: any) {
    store.updateTask(task.id, { status: 'error', error: String(err) })
    ElMessage.error(String(err))
  }
}

async function handleSelectQuality(qualityUrl: string, resolution: string) {
  showQualitySelect.value = false
  const task = store.tasks.find((t) => t.status === 'selecting_quality')
  if (!task) return

  store.updateTask(task.id, {
    m3u8Url: qualityUrl,
    quality: resolution,
  })

  await doStartDownload(task, qualityUrl, store.config.downloadDir)
}

async function doStartDownload(task: M3u8Task, m3u8Url: string, outputDir: string) {
  const filename = generateFilename(task, outputDir)

  store.updateTask(task.id, {
    status: 'downloading',
    m3u8Url,
    filename,
  })

  const config: DownloadConfig = {
    task_id: task.id,
    m3u8_url: m3u8Url,
    output_dir: outputDir,
    filename,
    headers: buildHeaders(),
    ffmpeg_path: store.config.ffmpegPath,
    max_segment_concurrent: store.config.maxSegmentConcurrent,
  }

  try {
    await invokeStartDownload(config)
  } catch (err: any) {
    store.updateTask(task.id, { status: 'error', error: String(err) })
    ElMessage.error(String(err))
  }
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/').filter(Boolean)
    return parts[parts.length - 2] || parts[parts.length - 1] || 'video'
  } catch {
    return 'video'
  }
}

function generateFilename(task: M3u8Task, outputDir: string): string {
  const title = task.title || extractFilename(task.url)
  const quality = task.quality !== 'auto' ? `_${task.quality}` : ''
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safeTitle = title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)
  return `${safeTitle}${quality}_${date}.mp4`
}

async function handleCancelTask(taskId: string) {
  try {
    await ElMessageBox.confirm(t('common.confirmCancel'), t('common.cancel'), {
      confirmButtonText: t('common.cancel'),
      cancelButtonText: t('common.retry'),
      type: 'warning',
    })
    await invokeCancelDownload(taskId)
    store.cancelTask(taskId)
  } catch {
    // User clicked "no" — do nothing
  }
}

async function handleRetryTask(taskId: string) {
  const task = store.tasks.find((t) => t.id === taskId)
  if (!task) return

  const hasFfmpeg = await invokeCheckFfmpeg(store.config.ffmpegPath)
  if (!hasFfmpeg) {
    ElMessage.error(t('common.ffmpegNotFound'))
    return
  }

  store.retryTask(taskId)
  await doStartDownload(task, task.m3u8Url || task.url, store.config.downloadDir)
}

function handleRemoveTask(taskId: string) {
  store.removeTask(taskId)
}

function handleClearInput() {
  urlInput.value = ''
  curlInput.value = ''
  showCurlInput.value = false
}

// Watch for window close
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (activeTasks.value.length > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}
</script>

<template>
  <div class="m3u8-downloader">
    <h2 class="tool-title">{{ t('tools.m3u8.name') }}</h2>

    <!-- Input Section -->
    <div class="input-section">
      <div class="input-row">
        <el-input
          v-model="urlInput"
          :placeholder="t('common.webpageUrl')"
          clearable
          class="url-input"
          @keydown.enter="handleAddTask"
        />
        <el-button type="primary" :icon="Download" @click="handleAddTask">
          {{ t('common.addTask') }}
        </el-button>
      </div>

      <div class="input-actions">
        <el-button text size="small" @click="showCurlInput = !showCurlInput">
          {{ t('common.curlPaste') }}
        </el-button>
        <el-button text size="small" @click="showHeadersConfig = !showHeadersConfig">
          {{ t('common.headers') }}
        </el-button>
      </div>

      <!-- cURL Input -->
      <div v-if="showCurlInput" class="curl-section">
        <el-input
          v-model="curlInput"
          type="textarea"
          :rows="3"
          placeholder="curl 'https://...' -H 'Referer: ...' -H 'Cookie: ...'"
        />
        <el-button size="small" :icon="Upload" @click="handleCurlPaste" style="margin-top: 8px">
          {{ t('common.curlPaste') }}
        </el-button>
      </div>

      <!-- Headers Config -->
      <div v-if="showHeadersConfig" class="headers-config">
        <el-input
          :model-value="store.config.headers.referer"
          placeholder="Referer"
          size="small"
          @update:model-value="(v: string) => store.updateConfig({ headers: { ...store.config.headers, referer: v } })"
        />
        <el-input
          :model-value="store.config.headers.cookie"
          placeholder="Cookie"
          size="small"
          @update:model-value="(v: string) => store.updateConfig({ headers: { ...store.config.headers, cookie: v } })"
        />
        <div
          v-for="(item, index) in store.config.headers.custom"
          :key="index"
          class="custom-header-row"
        >
          <el-input
            :model-value="item.key"
            placeholder="Header Name"
            size="small"
            @update:model-value="(v: string) => {
              const custom = [...store.config.headers.custom]
              custom[index] = { key: v, value: custom[index]?.value || '' }
              store.updateConfig({ headers: { ...store.config.headers, custom } })
            }"
          />
          <el-input
            :model-value="item.value"
            placeholder="Header Value"
            size="small"
            @update:model-value="(v: string) => {
              const custom = [...store.config.headers.custom]
              custom[index] = { key: custom[index]?.key || '', value: v }
              store.updateConfig({ headers: { ...store.config.headers, custom } })
            }"
          />
          <el-button
            :icon="X"
            size="small"
            circle
            @click="() => {
              const custom = store.config.headers.custom.filter((_, i) => i !== index)
              store.updateConfig({ headers: { ...store.config.headers, custom } })
            }"
          />
        </div>
        <el-button
          size="small"
          @click="() => store.updateConfig({
            headers: { ...store.config.headers, custom: [...store.config.headers.custom, { key: '', value: '' }] }
          })"
        >
          + Add Header
        </el-button>
      </div>

      <!-- Config Row: Download Dir + FFmpeg Path -->
      <div class="config-row">
        <div class="config-item">
          <label>{{ t('common.downloadDir') }}</label>
          <el-input
            :model-value="store.config.downloadDir"
            size="small"
            @update:model-value="(v: string) => store.updateConfig({ downloadDir: v })"
          />
        </div>
        <div class="config-item">
          <label>{{ t('common.ffmpegPath') }}</label>
          <el-input
            :model-value="store.config.ffmpegPath"
            size="small"
            @update:model-value="(v: string) => store.updateConfig({ ffmpegPath: v })"
          />
        </div>
      </div>
    </div>

    <!-- Quality Select Dialog -->
    <el-dialog v-model="showQualitySelect" :title="t('common.selectQuality')" width="400px">
      <div class="quality-list">
        <div
          v-for="q in store.tasks.find(t => t.status === 'selecting_quality')?.qualityOptions || []"
          :key="q.url"
          class="quality-item"
          @click="handleSelectQuality(q.url, q.resolution)"
        >
          <span>{{ q.resolution || `${q.bandwidth / 1000}k` }}</span>
          <span class="quality-bandwidth">{{ (q.bandwidth / 1000).toFixed(0) }} kbps</span>
        </div>
      </div>
    </el-dialog>

    <!-- Task List -->
    <div class="task-list">
      <!-- Active Tasks -->
      <div v-if="activeTasks.length > 0" class="task-section">
        <div class="section-title">{{ t('common.activeDownloads') }}</div>
        <div v-for="task in activeTasks" :key="task.id" class="task-item">
          <div class="task-info">
            <span class="task-title" :title="task.url">{{ task.filename || task.url }}</span>
            <span class="task-status">{{ t(`common.${task.status}`) }}</span>
          </div>
          <DownloadProgress
            :progress="task.progress"
            :speed="task.speed"
            :downloaded="task.downloaded"
            :total="task.total"
            :status="task.status"
          />
          <div class="task-actions">
            <el-button :icon="X" size="small" circle @click="handleCancelTask(task.id)" />
          </div>
        </div>
      </div>

      <!-- History -->
      <div v-if="completedTasks.length > 0" class="task-section">
        <div class="section-title">{{ t('common.history') }}</div>
        <div v-for="task in completedTasks" :key="task.id" class="task-item">
          <div class="task-info">
            <span class="task-title" :title="task.url">{{ task.filename || task.url }}</span>
            <span class="task-status" :class="{ error: task.status === 'error' }">
              {{ task.error || t(`common.${task.status}`) }}
            </span>
          </div>
          <DownloadProgress
            :progress="task.progress"
            :speed="task.speed"
            :downloaded="task.downloaded"
            :total="task.total"
            :status="task.status"
          />
          <div class="task-actions">
            <el-button
              v-if="task.status === 'error' || task.status === 'cancelled'"
              :icon="RotateCcw"
              size="small"
              circle
              @click="handleRetryTask(task.id)"
            />
            <el-button :icon="Trash2" size="small" circle @click="handleRemoveTask(task.id)" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="store.tasks.length === 0" class="empty-state">
        <Download :size="48" />
        <p>{{ t('tools.m3u8.description') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.m3u8-downloader {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 24px);
  min-height: 0;
  overflow-y: auto;
}

.tool-title {
  font-size: var(--font-size-xl, 20px);
  font-weight: 600;
  color: var(--text-title, #303133);
  margin: 0;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.input-row {
  display: flex;
  gap: var(--spacing-sm, 8px);
}

.url-input {
  flex: 1;
}

.input-actions {
  display: flex;
  gap: var(--spacing-sm, 8px);
}

.curl-section {
  background: var(--bg-color-page, #f5f7fa);
  padding: var(--spacing-md, 16px);
  border-radius: var(--radius-md, 8px);
}

.headers-config {
  background: var(--bg-color-page, #f5f7fa);
  padding: var(--spacing-md, 16px);
  border-radius: var(--radius-md, 8px);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.custom-header-row {
  display: flex;
  gap: var(--spacing-xs, 4px);
  align-items: center;
}

.config-row {
  display: flex;
  gap: var(--spacing-md, 16px);
}

.config-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-item label {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary, #909399);
}

.quality-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quality-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: border-color 0.2s;
}

.quality-item:hover {
  border-color: var(--color-primary, #409eff);
}

.quality-bandwidth {
  color: var(--text-color-secondary, #909399);
  font-size: var(--font-size-sm, 13px);
}

.task-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.task-section {
  margin-bottom: var(--spacing-lg, 24px);
}

.section-title {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  color: var(--text-caption, #909399);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-sm, 8px);
}

.task-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 16px);
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: var(--radius-md, 8px);
  margin-bottom: var(--spacing-sm, 8px);
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  font-size: var(--font-size-sm, 13px);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: var(--spacing-sm, 8px);
}

.task-status {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary, #909399);
  white-space: nowrap;
}

.task-status.error {
  color: var(--color-danger, #f56c6c);
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs, 4px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 0;
  color: var(--text-color-placeholder, #c0c4cc);
  gap: var(--spacing-md, 16px);
}
</style>
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx vue-tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/tools/M3u8Downloader.vue
git commit -m "feat: add M3u8Downloader tool page"
```

---

### Task 8: Router + Sidebar registration

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/components/Sidebar.vue`

**Interfaces:** None (wiring only)

- [ ] **Step 1: Add route**

Edit `src/router/index.ts`. Add this line to the `routes` array, AFTER the last existing route (after `'/hash'`):

```typescript
  { path: '/m3u8', component: () => import('@/tools/M3u8Downloader.vue') },
```

- [ ] **Step 2: Add Sidebar entry**

Edit `src/components/Sidebar.vue`. Two changes:

1. Add the icon import at the top, in the `from 'lucide-vue-next'` import block. Find the existing icon imports and add `Film`:
```typescript
import {
  Braces,
  Code2,
  Binary,
  Link,
  Clock,
  Regex,
  Palette,
  Hash,
  Film,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-vue-next'
```

2. Add to the `tools` array, AFTER the last entry (after `{ path: '/hash', icon: Hash, key: 'hash' }`):
```typescript
  { path: '/m3u8', icon: Film, key: 'm3u8' },
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx vue-tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/router/index.ts src/components/Sidebar.vue
git commit -m "feat: register M3U8Downloader route and sidebar entry"
```

---

> ⚠️ **Phase 5 begins: Rust backend.** All remaining tasks are in `src-tauri/`.

---

### Task 9: Rust dependencies and capabilities

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Add Cargo dependencies**

Edit `src-tauri/Cargo.toml`. In the `[dependencies]` section, add these lines after the existing `serde_json = "1"`:

```toml
reqwest = { version = "0.12", features = ["rustls-tls", "stream", "gzip", "brotli"] }
tokio = { version = "1", features = ["full"] }
scraper = "0.20"
aes = "0.8"
cbc = "0.1"
uuid = { version = "1", features = ["v4"] }
base64 = "0.22"
url = "2"
```

- [ ] **Step 2: Add capabilities for shell/ffmpeg**

Edit `src-tauri/capabilities/default.json`. Add shell execution permissions to the `permissions` array. Insert these lines before the closing `]` of the permissions array:

```json
    "shell:default",
    "shell:allow-execute",
    "shell:allow-spawn"
```

The updated permissions array should look like:

```json
  "permissions": [
    "core:default",
    "opener:default",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "core:window:allow-unmaximize",
    "core:window:allow-is-maximized",
    "core:window:allow-toggle-maximize",
    "core:window:allow-start-dragging",
    "shell:default",
    "shell:allow-execute",
    "shell:allow-spawn"
  ]
```

Also add the shell plugin to `Cargo.toml` dependencies:

```toml
tauri-plugin-shell = "2"
```

And register it in `src-tauri/src/lib.rs` (will be done in Task 15).

- [ ] **Step 3: Verify Cargo compiles (dependencies only)**

Run: `cargo check`
Expected: Dependencies download and compile successfully (may have warnings about unused imports — acceptable at this stage).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/capabilities/default.json
git commit -m "feat: add Rust dependencies and shell capabilities for m3u8"
```

---

### Task 10: Rust playlist parser with tests

**Files:**
- Create: `src-tauri/src/m3u8/mod.rs`
- Create: `src-tauri/src/m3u8/playlist.rs`

**Interfaces:**
- Produces: `PlaylistInfo` struct, `M3u8Quality` struct, `KeyInfo` struct, `parse_m3u8(content: &str) -> PlaylistInfo`, `extract_m3u8_urls(html: &str, base_url: &str) -> Vec<M3u8UrlInfo>`

- [ ] **Step 1: Write mod.rs stub**

Create `src-tauri/src/m3u8/mod.rs`:

```rust
pub mod playlist;
pub mod decrypt;
pub mod downloader;
pub mod converter;
```

- [ ] **Step 2: Write playlist.rs with tests inline**

Create `src-tauri/src/m3u8/playlist.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct M3u8Quality {
    pub bandwidth: u64,
    pub resolution: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyInfo {
    pub method: String,
    pub uri: Option<String>,
    pub iv: Option<String>,
    pub start_segment: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentInfo {
    pub url: String,
    pub duration: f64,
    pub index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlaylistType {
    Master,
    Media,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistInfo {
    pub playlist_type: PlaylistType,
    pub qualities: Vec<M3u8Quality>,
    pub segments: Vec<SegmentInfo>,
    pub keys: Vec<KeyInfo>,
    pub has_encryption: bool,
    pub has_endlist: bool,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct M3u8UrlInfo {
    pub url: String,
    pub label: String,
}

/// Parse an M3U8 playlist string and return structured info.
/// Automatically follows the first master playlist link if detected.
pub fn parse_m3u8(content: &str) -> PlaylistInfo {
    let lines: Vec<&str> = content.lines().map(|l| l.trim()).collect();

    let has_master = lines.iter().any(|l| l.starts_with("#EXT-X-STREAM-INF"));
    let has_endlist = lines.iter().any(|l| l.starts_with("#EXT-X-ENDLIST"));

    if has_master {
        parse_master_playlist(&lines)
    } else {
        parse_media_playlist(&lines, has_endlist, content)
    }
}

fn parse_master_playlist(lines: &[&str]) -> PlaylistInfo {
    let mut qualities = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        if lines[i].starts_with("#EXT-X-STREAM-INF") {
            let mut bandwidth: u64 = 0;
            let mut resolution = String::from("unknown");

            let line = lines[i];
            // Parse BANDWIDTH=
            if let Some(bw_start) = line.find("BANDWIDTH=") {
                let bw_part = &line[bw_start + 10..];
                let bw_end = bw_part.find(',').unwrap_or(bw_part.len());
                bandwidth = bw_part[..bw_end].parse().unwrap_or(0);
            }
            // Parse RESOLUTION=
            if let Some(res_start) = line.find("RESOLUTION=") {
                let res_part = &line[res_start + 11..];
                let res_end = res_part.find(',').unwrap_or(res_part.len());
                resolution = res_part[..res_end].to_string();
            }

            // Next non-empty, non-comment line is the URL
            for j in i + 1..lines.len() {
                if !lines[j].is_empty() && !lines[j].starts_with('#') {
                    qualities.push(M3u8Quality {
                        bandwidth,
                        resolution: resolution.clone(),
                        url: lines[j].to_string(),
                    });
                    i = j;
                    break;
                }
            }
        }
        i += 1;
    }

    PlaylistInfo {
        playlist_type: PlaylistType::Master,
        qualities,
        segments: vec![],
        keys: vec![],
        has_encryption: false,
        has_endlist: true,
        raw: String::new(),
    }
}

fn parse_media_playlist(lines: &[&str], has_endlist: bool, raw: &str) -> PlaylistInfo {
    let mut segments = Vec::new();
    let mut keys = Vec::new();
    let mut has_encryption = false;
    let mut current_key: Option<KeyInfo> = None;
    let mut seg_index = 0;

    for (i, line) in lines.iter().enumerate() {
        if line.starts_with("#EXT-X-KEY") {
            let mut method = String::new();
            let mut uri: Option<String> = None;
            let mut iv: Option<String> = None;

            if let Some(m_start) = line.find("METHOD=") {
                let m_part = &line[m_start + 7..];
                let m_end = m_part.find(',').unwrap_or(m_part.len());
                method = m_part[..m_end].to_string();
            }

            if let Some(u_start) = line.find("URI=\"") {
                let u_part = &line[u_start + 5..];
                if let Some(u_end) = u_part.find('"') {
                    uri = Some(u_part[..u_end].to_string());
                }
            }

            if let Some(iv_start) = line.find("IV=0x") {
                let iv_part = &line[iv_start + 5..];
                let iv_end = iv_part.find(',').unwrap_or(iv_part.len());
                iv = Some(iv_part[..iv_end].to_string());
            }

            if method == "AES-128" {
                has_encryption = true;
                current_key = Some(KeyInfo {
                    method,
                    uri,
                    iv,
                    start_segment: seg_index,
                });
                keys.push(current_key.clone().unwrap());
            } else if method == "NONE" {
                current_key = None;
            }
        }

        if line.starts_with("#EXTINF") {
            let duration: f64 = line
                .trim_start_matches("#EXTINF:")
                .split(',')
                .next()
                .unwrap_or("0")
                .parse()
                .unwrap_or(0.0);

            // Find URL on subsequent lines
            for j in i + 1..lines.len() {
                if !lines[j].is_empty() && !lines[j].starts_with('#') {
                    segments.push(SegmentInfo {
                        url: lines[j].to_string(),
                        duration,
                        index: seg_index,
                    });
                    seg_index += 1;
                    break;
                }
            }
        }
    }

    PlaylistInfo {
        playlist_type: PlaylistType::Media,
        qualities: vec![],
        segments,
        keys,
        has_encryption,
        has_endlist,
        raw: raw.to_string(),
    }
}

/// Extract M3U8 URLs from HTML content.
pub fn extract_m3u8_urls(html: &str, _base_url: &str) -> Vec<M3u8UrlInfo> {
    let mut results = Vec::new();

    // Strategy 1: Regex for .m3u8 patterns in the HTML
    let re = regex_lite::Regex::new(r#"https?://[^\s"'<>]+\.m3u8[^\s"'<>]*"#).unwrap();
    for cap in re.find_iter(html) {
        let url = cap.as_str().to_string();
        // Avoid duplicates
        if !results.iter().any(|r: &M3u8UrlInfo| r.url == url) {
            results.push(M3u8UrlInfo {
                url,
                label: String::new(),
            });
        }
    }

    // Strategy 2: Parse <video> and <source> tags with scraper
    let document = scraper::Html::parse_document(html);
    let video_selector = scraper::Selector::parse("video source, video[src]").unwrap();

    for element in document.select(&video_selector) {
        if let Some(src) = element.value().attr("src") {
            let url = if src.starts_with("http") {
                src.to_string()
            } else {
                // Relative URL resolution would need base_url, skip for now
                continue;
            };
            if (url.contains(".m3u8") || url.contains("m3u8")) && !results.iter().any(|r: &M3u8UrlInfo| r.url == url) {
                let label = element.value().attr("title").unwrap_or("").to_string();
                results.push(M3u8UrlInfo { url, label });
            }
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_master_playlist() {
        let content = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1920x1080\nhttps://example.com/high.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=1280x720\nhttps://example.com/low.m3u8\n";
        let info = parse_m3u8(content);

        assert!(matches!(info.playlist_type, PlaylistType::Master));
        assert_eq!(info.qualities.len(), 2);
        assert_eq!(info.qualities[0].bandwidth, 2000000);
        assert_eq!(info.qualities[0].resolution, "1920x1080");
        assert_eq!(info.qualities[0].url, "https://example.com/high.m3u8");
        assert_eq!(info.qualities[1].bandwidth, 1000000);
        assert_eq!(info.qualities[1].resolution, "1280x720");
    }

    #[test]
    fn test_parse_media_playlist_with_aes_encryption() {
        let content = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-KEY:METHOD=AES-128,URI=\"https://example.com/key.bin\",IV=0x00000000000000000000000000000001\n#EXTINF:10.0,\nhttps://example.com/seg-1.ts\n#EXTINF:10.0,\nhttps://example.com/seg-2.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert!(matches!(info.playlist_type, PlaylistType::Media));
        assert_eq!(info.segments.len(), 2);
        assert!(info.has_encryption);
        assert_eq!(info.keys.len(), 1);
        assert_eq!(info.keys[0].method, "AES-128");
        assert_eq!(info.keys[0].uri.as_deref(), Some("https://example.com/key.bin"));
        assert_eq!(info.keys[0].iv.as_deref(), Some("00000000000000000000000000000001"));
        assert!(info.has_endlist);
    }

    #[test]
    fn test_parse_media_playlist_no_encryption() {
        let content = "#EXTM3U\n#EXTINF:5.0,\nhttps://example.com/seg-1.ts\n#EXTINF:5.0,\nhttps://example.com/seg-2.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert_eq!(info.segments.len(), 2);
        assert!(!info.has_encryption);
        assert!(info.keys.is_empty());
    }

    #[test]
    fn test_parse_rotating_keys() {
        let content = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key1.bin\"\n#EXTINF:10.0,\nseg1.ts\n#EXT-X-KEY:METHOD=AES-128,URI=\"key2.bin\"\n#EXTINF:10.0,\nseg2.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert_eq!(info.keys.len(), 2);
        assert_eq!(info.keys[0].uri.as_deref(), Some("key1.bin"));
        assert_eq!(info.keys[0].start_segment, 0);
        assert_eq!(info.keys[1].uri.as_deref(), Some("key2.bin"));
        assert_eq!(info.keys[1].start_segment, 1);
    }

    #[test]
    fn test_extract_m3u8_from_html() {
        let html = r#"<html><body><video><source src="https://example.com/video.m3u8" title="Main Video"></video></body></html>"#;
        let urls = extract_m3u8_urls(html, "https://example.com/");

        assert!(!urls.is_empty());
        assert_eq!(urls[0].url, "https://example.com/video.m3u8");
        assert_eq!(urls[0].label, "Main Video");
    }

    #[test]
    fn test_extract_m3u8_from_raw_text() {
        let html = r#"<script>var src = "https://cdn.example.com/stream/index.m3u8?token=abc";</script>"#;
        let urls = extract_m3u8_urls(html, "https://cdn.example.com/");

        assert_eq!(urls.len(), 1);
        assert!(urls[0].url.contains("index.m3u8"));
    }

    #[test]
    fn test_parse_media_playlist_with_iv() {
        let content = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\",IV=0xABCDEF1234567890ABCDEF1234567890\n#EXTINF:10.0,\nseg1.ts\n#EXT-X-ENDLIST\n";
        let info = parse_m3u8(content);

        assert_eq!(info.keys[0].iv.as_deref(), Some("ABCDEF1234567890ABCDEF1234567890"));
    }
}
```

Note: We're using `regex_lite` to avoid adding another crate. But we don't have it yet...

Let me revise — use `regex` crate instead. Add `regex = "1"` to Cargo.toml in Task 9 dependencies.

Actually, let me use a simpler approach — use a basic string search instead of regex to avoid the dependency:

Replace the regex approach with manual string matching:

```rust
/// Simple manual extraction of m3u8 URLs from text without regex dependency.
fn find_m3u8_urls_in_text(text: &str) -> Vec<String> {
    let mut results = Vec::new();
    let mut remaining = text;

    while let Some(pos) = remaining.find(".m3u8") {
        let end_pos = pos + ".m3u8".len();
        // Extend past any query params
        let slice_end = remaining[end_pos..]
            .find(|c: char| c.is_whitespace() || c == '"' || c == '\'' || c == '<' || c == '>')
            .map(|p| end_pos + p)
            .unwrap_or(remaining.len());

        let slice = &remaining[..slice_end];
        // Find the start of the URL (look backwards for https:// or http://)
        if let Some(start_pos) = slice.rfind("https://")
            .or_else(|| slice.rfind("http://"))
        {
            let url = &slice[start_pos..slice_end];
            if !results.contains(&url.to_string()) {
                results.push(url.to_string());
            }
        }

        remaining = &remaining[end_pos..];
    }

    results
}
```

Hmm, this is getting complex. Let me just add `regex` to Cargo.toml. Update Task 9 step 1 to also include:

```toml
regex = "1"
```

OK, let me just update the plan to reflect that. The actual implementation can use either approach.

Actually, for simplicity for a weak model, let me just use `regex` crate. I'll update the Task 9 Cargo.toml to include it.

Let me finalize the plan now — I'll note in Task 9 that `regex` is included in dependencies, and use it in the playlist implementation.

- [ ] **Step 2: Run Rust tests**

Run: `cargo test m3u8::playlist`
Expected: All 7 tests PASS

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/m3u8/mod.rs src-tauri/src/m3u8/playlist.rs
git commit -m "feat: add M3U8 playlist parser with tests"
```

---

### Task 11: Rust AES-128-CBC decrypt with tests

**Files:**
- Create: `src-tauri/src/m3u8/decrypt.rs`

**Interfaces:**
- Produces: `decrypt_aes128_cbc(data: &[u8], key: &[u8], iv: &[u8]) -> Vec<u8>`

- [ ] **Step 1: Write decrypt.rs with tests**

Create `src-tauri/src/m3u8/decrypt.rs`:

```rust
use aes::cipher::{BlockDecryptMut, KeyIvInit};
use cbc::Decryptor;

type Aes128CbcDec = Decryptor<aes::Aes128>;

/// Decrypt AES-128-CBC encrypted data.
/// key: 16 bytes AES key
/// iv: 16 bytes initialization vector
/// Returns decrypted bytes (no padding removal — TS segments use full-block encryption).
pub fn decrypt_aes128_cbc(data: &[u8], key: &[u8], iv: &[u8]) -> Result<Vec<u8>, String> {
    if key.len() != 16 {
        return Err(format!("Invalid key length: expected 16 bytes, got {}", key.len()));
    }
    if iv.len() != 16 {
        return Err(format!("Invalid IV length: expected 16 bytes, got {}", iv.len()));
    }

    // AES-CBC requires data length to be a multiple of 16
    if data.len() % 16 != 0 {
        return Err(format!(
            "Data length must be a multiple of 16 bytes, got {} bytes",
            data.len()
        ));
    }

    let mut buf = data.to_vec();
    let cipher = Aes128CbcDec::new(key.into(), iv.into());

    // Decrypt in-place using block-by-block processing
    let block_count = buf.len() / 16;
    for i in 0..block_count {
        let block_start = i * 16;
        let block_end = block_start + 16;
        let block: &mut [u8; 16] = buf[block_start..block_end]
            .try_into()
            .map_err(|e| format!("Block conversion error: {:?}", e))?;
        let mut block_arr = (*block).into();
        cipher.decrypt_block_mut(&mut block_arr);
        buf[block_start..block_end].copy_from_slice(&block_arr);
    }

    Ok(buf)
}

/// Parse a hex string IV (with or without 0x prefix) into 16-byte array.
pub fn parse_iv(iv_str: &str) -> Result<[u8; 16], String> {
    let hex = iv_str.strip_prefix("0x").unwrap_or(iv_str).to_lowercase();
    let hex = if hex.len() < 32 {
        format!("{:0>32}", hex)
    } else {
        hex
    };

    let bytes = hex::decode(&hex).map_err(|e| format!("IV hex decode error: {}", e))?;
    if bytes.len() != 16 {
        return Err(format!("IV must be 16 bytes, got {}", bytes.len()));
    }

    let mut arr = [0u8; 16];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

/// Default IV from segment index (HLS spec: IV = segment_index as big-endian u128).
pub fn default_iv(segment_index: u32) -> [u8; 16] {
    let mut iv = [0u8; 16];
    // Segment index as u32 big-endian in the last 4 bytes
    iv[12..16].copy_from_slice(&segment_index.to_be_bytes());
    iv
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decrypt_aes128_cbc_known_vector() {
        // Test vector from NIST SP 800-38A
        let key: [u8; 16] = [
            0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6,
            0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c,
        ];
        let iv: [u8; 16] = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
            0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
        ];
        // First block of NIST test vector plaintext
        let ciphertext: [u8; 16] = [
            0x76, 0x49, 0xab, 0xac, 0x81, 0x19, 0xb2, 0x46,
            0xce, 0xe9, 0x8e, 0x9b, 0x12, 0xe9, 0x19, 0x7d,
        ];
        let expected: [u8; 16] = [
            0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96,
            0xe9, 0x3d, 0x7e, 0x11, 0x73, 0x93, 0x17, 0x2a,
        ];

        let result = decrypt_aes128_cbc(&ciphertext, &key, &iv).unwrap();
        assert_eq!(result, expected.to_vec());
    }

    #[test]
    fn test_decrypt_wrong_key_length() {
        let data = vec![0u8; 16];
        let key = vec![0u8; 15]; // Wrong length
        let iv = vec![0u8; 16];
        let result = decrypt_aes128_cbc(&data, &key, &iv);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("key length"));
    }

    #[test]
    fn test_parse_iv_with_0x_prefix() {
        let iv = parse_iv("0xABCDEF1234567890ABCDEF1234567890").unwrap();
        assert_eq!(iv[0], 0xAB);
        assert_eq!(iv[1], 0xCD);
        assert_eq!(iv[15], 0x90);
    }

    #[test]
    fn test_parse_iv_without_prefix() {
        let iv = parse_iv("00000000000000000000000000000001").unwrap();
        assert_eq!(iv[15], 0x01);
    }

    #[test]
    fn test_parse_iv_short_pads_with_zeros() {
        let iv = parse_iv("1").unwrap();
        assert_eq!(iv[15], 0x01);
        assert_eq!(iv[0], 0x00);
    }

    #[test]
    fn test_default_iv() {
        let iv = default_iv(42);
        // Segment 42 in big-endian u32 = 0x0000002A
        assert_eq!(iv[12..16], [0x00, 0x00, 0x00, 0x2a]);
    }
}
```

Note: This requires `hex` crate. Add to Task 9 Cargo.toml: `hex = "0.4"`.

- [ ] **Step 2: Update Task 9 dependencies if not already done**

Make sure `src-tauri/Cargo.toml` also includes `hex = "0.4"` and `regex = "1"`:

```toml
hex = "0.4"
regex = "1"
```

- [ ] **Step 3: Run Rust tests**

Run: `cargo test m3u8::decrypt`
Expected: All 6 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/m3u8/decrypt.rs src-tauri/Cargo.toml
git commit -m "feat: add AES-128-CBC decrypt module with tests"
```

---

### Task 12: Tauri commands in lib.rs + mod.rs finalization

**Files:**
- Modify: `src-tauri/src/lib.rs` (add commands + register m3u8 module)
- Modify: `src-tauri/src/m3u8/mod.rs` (add shared state struct)

**Interfaces:**
- Produces: Tauri commands: `fetch_page`, `parse_m3u8_urls`, `parse_m3u8`, `start_download`, `cancel_download`, `check_ffmpeg`
- Consumes: All m3u8 modules (Task 10, 11, 13, 14)

- [ ] **Step 1: Write final lib.rs**

Replace `src-tauri/src/lib.rs` completely:

```rust
mod m3u8;

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use m3u8::playlist::{self, M3u8UrlInfo};
use serde::{Deserialize, Serialize};

/// Shared download state: tracks active downloads for cancellation.
pub struct DownloadState {
    pub active_downloads: Mutex<HashMap<String, bool>>, // task_id → should_cancel
}

impl DownloadState {
    pub fn new() -> Self {
        Self {
            active_downloads: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct FetchPageResult {
    html: String,
    final_url: String,
}

#[tauri::command]
async fn fetch_page(
    url: String,
    headers: HashMap<String, String>,
) -> Result<FetchPageResult, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client.get(&url);
    for (key, value) in &headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let final_url = response.url().to_string();

    // Check content-type — only process text/html for webpage mode
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let html = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // If it's not HTML (e.g., direct m3u8 response), warn but still return
    if !content_type.contains("text/html") && !content_type.contains("text/plain") {
        // Return the raw content as html; caller (frontend) decides how to use it
    }

    Ok(FetchPageResult { html, final_url })
}

#[tauri::command]
async fn parse_m3u8_urls(
    html: String,
    base_url: String,
) -> Result<Vec<M3u8UrlInfo>, String> {
    Ok(playlist::extract_m3u8_urls(&html, &base_url))
}

#[derive(Debug, Serialize)]
pub struct ParseM3u8Result {
    playlist_type: String,
    qualities: Vec<playlist::M3u8Quality>,
    segment_count: usize,
    has_encryption: bool,
}

#[tauri::command]
async fn parse_m3u8(
    url: String,
    headers: HashMap<String, String>,
) -> Result<ParseM3u8Result, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client.get(&url);
    for (key, value) in &headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch M3U8: {}", e))?;

    let content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read M3U8 content: {}", e))?;

    let info = playlist::parse_m3u8(&content);

    if !info.has_endlist {
        return Err("Live streams are not supported".to_string());
    }

    // Check for unsupported encryption
    for key in &info.keys {
        if key.method != "AES-128" && key.method != "NONE" {
            return Err(format!(
                "Encryption method not supported: {}",
                key.method
            ));
        }
    }

    let playlist_type = match info.playlist_type {
        playlist::PlaylistType::Master => "master".to_string(),
        playlist::PlaylistType::Media => "media".to_string(),
    };

    Ok(ParseM3u8Result {
        playlist_type,
        qualities: info.qualities,
        segment_count: info.segments.len(),
        has_encryption: info.has_encryption,
    })
}

#[derive(Debug, Deserialize)]
pub struct DownloadConfig {
    task_id: String,
    m3u8_url: String,
    output_dir: String,
    filename: String,
    headers: HashMap<String, String>,
    ffmpeg_path: String,
    max_segment_concurrent: usize,
}

#[tauri::command]
async fn start_download(
    config: DownloadConfig,
    state: State<'_, DownloadState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // Mark task as active
    {
        let mut active = state.active_downloads.lock().map_err(|e| e.to_string())?;
        active.insert(config.task_id.clone(), false);
    }

    let task_id = config.task_id.clone();
    let app_handle_clone = app_handle.clone();
    let state_clone = state.inner().clone();

    // Spawn async download task
    tauri::async_runtime::spawn(async move {
        let result = m3u8::downloader::run_download(
            &config,
            &app_handle_clone,
        ).await;

        // Clean up active state
        if let Ok(mut active) = state_clone.active_downloads.lock() {
            active.remove(&task_id);
        }
    });

    Ok(())
}

#[tauri::command]
async fn cancel_download(
    task_id: String,
    state: State<'_, DownloadState>,
) -> Result<(), String> {
    let mut active = state.active_downloads.lock().map_err(|e| e.to_string())?;
    if let Some(cancel_flag) = active.get_mut(&task_id) {
        *cancel_flag = true;
    }
    Ok(())
}

#[tauri::command]
async fn check_ffmpeg(ffmpeg_path: String) -> Result<bool, String> {
    let output = std::process::Command::new(&ffmpeg_path)
        .arg("-version")
        .output();

    Ok(output.is_ok())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(DownloadState::new())
        .invoke_handler(tauri::generate_handler![
            fetch_page,
            parse_m3u8_urls,
            parse_m3u8,
            start_download,
            cancel_download,
            check_ffmpeg,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Verify compilation (downloader/converter not yet needed for command registration)**

We need to stub `m3u8::downloader::run_download` since downloader.rs isn't created yet. Let's add a minimal stub.

Update `src-tauri/src/m3u8/mod.rs`:

```rust
pub mod playlist;
pub mod decrypt;
pub mod downloader;
pub mod converter;
```

Create `src-tauri/src/m3u8/downloader.rs` with the stub and implementation:

File is created in Task 13. For now, let's create a minimal version.

Actually, the plan is sequential — downloader.rs is Task 13. So for now, let's create a stub that compiles:

Create `src-tauri/src/m3u8/downloader.rs` (minimal stub for now, Task 13 will replace it):

```rust
use crate::DownloadConfig;
use tauri::AppHandle;

pub async fn run_download(
    config: &DownloadConfig,
    app_handle: &AppHandle,
) -> Result<(), String> {
    // Stub — will be implemented in Task 13
    let _ = (config, app_handle);
    Err("Downloader not yet implemented".to_string())
}
```

And create `src-tauri/src/m3u8/converter.rs` (stub for now, Task 14 will replace):

```rust
// Converter stub — will be implemented in Task 14
```

- [ ] **Step 3: Verify Cargo compiles**

Run: `cargo check`
Expected: Compiles successfully (stubs may generate warnings — acceptable).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/m3u8/mod.rs src-tauri/src/m3u8/downloader.rs src-tauri/src/m3u8/converter.rs
git commit -m "feat: add Tauri commands + stubs for m3u8 downloader"
```

---

### Task 13: Downloader implementation

**Files:**
- Modify: `src-tauri/src/m3u8/downloader.rs` (replace stub)

**Interfaces:**
- Consumes: `DownloadConfig`, `playlist::parse_m3u8`, `decrypt::decrypt_aes128_cbc`
- Produces: `run_download(config, app_handle) -> Result<(), String>`

This is the core pipeline:
1. Fetch & parse m3u8 playlist
2. Fetch encryption keys (if any)
3. Concurrently download TS segments
4. Decrypt segments
5. Write to temp directory
6. Call converter (Task 14)
7. Emit progress/completion/error events

- [ ] **Step 1: Write the downloader implementation**

Replace `src-tauri/src/m3u8/downloader.rs`:

```rust
use crate::DownloadConfig;
use crate::m3u8::playlist::{self, PlaylistType};
use crate::m3u8::decrypt;
use crate::m3u8::converter;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;
use tauri::Emitter;
use tokio::sync::Semaphore;

#[derive(Debug, Clone, Serialize)]
struct ProgressEvent {
    task_id: String,
    percent: u32,
    speed: String,
    downloaded: usize,
    total: usize,
}

#[derive(Debug, Clone, Serialize)]
struct CompleteEvent {
    task_id: String,
    output_path: String,
}

#[derive(Debug, Clone, Serialize)]
struct ErrorEvent {
    task_id: String,
    error: String,
}

pub async fn run_download(
    config: &DownloadConfig,
    app_handle: &AppHandle,
) -> Result<(), String> {
    let task_id = config.task_id.clone();

    // Step 1: Fetch and parse M3U8 playlist
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let mut request = client.get(&config.m3u8_url);
    for (key, value) in &config.headers {
        request = request.header(key.as_str(), value.as_str());
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch M3U8: {}", e))?;

    let content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read M3U8: {}", e))?;

    let info = playlist::parse_m3u8(&content);

    if !info.has_endlist {
        let _ = app_handle.emit("download-error", ErrorEvent {
            task_id: task_id.clone(),
            error: "Live streams are not supported".to_string(),
        });
        return Err("Live streams are not supported".to_string());
    }

    let segments = info.segments.clone();
    let total = segments.len();
    if total == 0 {
        let _ = app_handle.emit("download-error", ErrorEvent {
            task_id: task_id.clone(),
            error: "No segments found in playlist".to_string(),
        });
        return Err("No segments found in playlist".to_string());
    }

    // Step 2: Fetch encryption keys (if needed)
    let mut key_data: HashMap<usize, Vec<u8>> = HashMap::new(); // key_index → key bytes
    for (idx, key_info) in info.keys.iter().enumerate() {
        if key_info.method == "AES-128" {
            if let Some(ref uri) = key_info.uri {
                let key_response = client
                    .get(uri)
                    .headers(request_headers_to_map(&config.headers))
                    .send()
                    .await
                    .map_err(|e| format!("Failed to fetch key: {}", e))?;

                let key_bytes = key_response
                    .bytes()
                    .await
                    .map_err(|e| format!("Failed to read key: {}", e))?;

                key_data.insert(idx, key_bytes.to_vec());
            }
        }
    }

    // Step 3: Prepare temp directory
    let temp_dir = std::env::temp_dir()
        .join("ztools")
        .join(&task_id)
        .join("segments");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    // Save playlist snapshot for resume
    let snapshot_path = std::env::temp_dir()
        .join("ztools")
        .join(&task_id)
        .join("playlist.m3u8");
    if let Some(parent) = snapshot_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    std::fs::write(&snapshot_path, &content).ok();

    // Step 4: Download segments concurrently
    let semaphore = Arc::new(Semaphore::new(config.max_segment_concurrent.max(1)));
    let downloaded = Arc::new(std::sync::Mutex::new(0usize));
    let total_bytes = Arc::new(std::sync::Mutex::new(0u64));
    let start_time = std::time::Instant::now();

    let mut handles = Vec::new();

    for (i, segment) in segments.iter().enumerate() {
        let client = client.clone();
        let headers = config.headers.clone();
        let segment_url = resolve_url(&config.m3u8_url, &segment.url);
        let output_path = temp_dir.join(format!("{:05}.ts", i));
        let semaphore = semaphore.clone();
        let downloaded = downloaded.clone();
        let total_bytes = total_bytes.clone();
        let app_handle = app_handle.clone();
        let task_id = task_id.clone();
        let start_time = start_time;
        let total = total;

        // Determine which key to use for this segment
        let key_bytes: Option<Vec<u8>> = if info.has_encryption {
            // Find the last key whose start_segment <= i
            let mut active_key_idx: Option<usize> = None;
            for (idx, ki) in info.keys.iter().enumerate() {
                if ki.start_segment <= i {
                    active_key_idx = Some(idx);
                }
            }
            active_key_idx.and_then(|idx| key_data.get(&idx).cloned())
        } else {
            None
        };

        let iv: Option<Vec<u8>> = if info.has_encryption {
            let mut active_key: Option<&playlist::KeyInfo> = None;
            for ki in &info.keys {
                if ki.start_segment <= i {
                    active_key = Some(ki);
                }
            }

            if let Some(ref ki) = active_key {
                match &ki.iv {
                    Some(iv_hex) => {
                        match decrypt::parse_iv(iv_hex) {
                            Ok(arr) => Some(arr.to_vec()),
                            Err(_) => Some(decrypt::default_iv(i as u32 + 1).to_vec()),
                        }
                    }
                    None => Some(decrypt::default_iv(i as u32 + 1).to_vec()),
                }
            } else {
                None
            }
        } else {
            None
        };

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();

            // Check if segment already exists (resume)
            if output_path.exists() {
                let mut d = downloaded.lock().unwrap();
                *d += 1;
                return Ok::<usize, String>(output_path.metadata().map(|m| m.len()).unwrap_or(0) as usize);
            }

            // Download with retry
            let mut last_error = String::new();
            for retry in 0..3 {
                let mut req = client.get(&segment_url);
                for (k, v) in &headers {
                    req = req.header(k.as_str(), v.as_str());
                }

                match req.send().await {
                    Ok(resp) => {
                        match resp.bytes().await {
                            Ok(data) => {
                                let mut decrypted = if let (Some(ref key), Some(ref iv_arr)) = (&key_bytes, &iv)
                                {
                                    decrypt::decrypt_aes128_cbc(&data, key, iv_arr)?
                                } else {
                                    data.to_vec()
                                };

                                // Write to file
                                std::fs::write(&output_path, &decrypted)
                                    .map_err(|e| format!("Failed to write segment: {}", e))?;

                                decrypted.clear();

                                let mut d = downloaded.lock().unwrap();
                                *d += 1;
                                let mut tb = total_bytes.lock().unwrap();
                                *tb += output_path.metadata().map(|m| m.len()).unwrap_or(0) as u64;

                                // Emit progress
                                let elapsed = start_time.elapsed().as_secs_f64();
                                let speed = if elapsed > 0.0 {
                                    let mbps = (*tb as f64 / 1_000_000.0) / elapsed;
                                    format!("{:.1} MB/s", mbps)
                                } else {
                                    String::new()
                                };

                                let percent = ((*d as f64 / total as f64) * 100.0) as u32;
                                let _ = app_handle.emit("download-progress", ProgressEvent {
                                    task_id: task_id.clone(),
                                    percent,
                                    speed,
                                    downloaded: *d,
                                    total,
                                });

                                return Ok(data.len());
                            }
                            Err(e) => {
                                last_error = format!("Failed to read segment body: {}", e);
                                if retry < 2 {
                                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        last_error = format!("Segment download failed: {}", e);
                        if retry < 2 {
                            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                        }
                    }
                }
            }

            Err(last_error)
        });

        handles.push(handle);
    }

    // Wait for all downloads to complete
    let mut has_error = false;
    let mut error_msg = String::new();
    for handle in handles {
        match handle.await {
            Ok(Ok(_)) => {}
            Ok(Err(e)) => {
                has_error = true;
                error_msg = e;
            }
            Err(e) => {
                has_error = true;
                error_msg = format!("Task join error: {}", e);
            }
        }
    }

    if has_error {
        let _ = app_handle.emit("download-error", ErrorEvent {
            task_id: task_id.clone(),
            error: error_msg.clone(),
        });
        return Err(error_msg);
    }

    // Step 5: Convert TS to MP4
    let output_dir = if config.output_dir.is_empty() {
        dirs_next::download_dir()
            .map(|d| d.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string())
    } else {
        config.output_dir.clone()
    };

    let output_path = PathBuf::from(&output_dir).join(&config.filename);
    let emoji = app_handle.clone();
    let tid = task_id.clone();

    // Emit converting status
    let _ = emoji.emit("download-progress", ProgressEvent {
        task_id: tid.clone(),
        percent: 100,
        speed: "Converting...".to_string(),
        downloaded: total,
        total,
    });

    match converter::convert_to_mp4(&temp_dir, &output_path, &config.ffmpeg_path) {
        Ok(()) => {
            // Clean up temp files on success
            let _ = std::fs::remove_dir_all(temp_dir.parent().unwrap_or(&temp_dir));

            let _ = emoji.emit("download-complete", CompleteEvent {
                task_id: tid,
                output_path: output_path.to_string_lossy().to_string(),
            });
        }
        Err(e) => {
            // Keep temp files on failure
            let _ = emoji.emit("download-error", ErrorEvent {
                task_id: tid,
                error: format!("FFmpeg conversion failed: {}. Temp files preserved at {:?}", e, temp_dir.parent()),
            });
            return Err(e);
        }
    }

    Ok(())
}

fn resolve_url(base_url: &str, segment_url: &str) -> String {
    if segment_url.starts_with("http://") || segment_url.starts_with("https://") {
        return segment_url.to_string();
    }

    // Relative URL resolution
    let base = url::Url::parse(base_url).unwrap();
    match base.join(segment_url) {
        Ok(resolved) => resolved.to_string(),
        Err(_) => {
            // Fallback: prepend base path
            let base_path = base.path();
            let base_dir = base_path.rsplit_once('/')
                .map(|(dir, _)| dir)
                .unwrap_or("");
            format!("{}://{}{}/{}", base.scheme(), base.host_str().unwrap_or(""), base_dir, segment_url)
        }
    }
}

fn request_headers_to_map(headers: &HashMap<String, String>) -> reqwest::header::HeaderMap {
    let mut map = reqwest::header::HeaderMap::new();
    for (k, v) in headers {
        if let (Ok(key), Ok(value)) = (
            reqwest::header::HeaderName::from_bytes(k.as_bytes()),
            reqwest::header::HeaderValue::from_str(v),
        ) {
            map.insert(key, value);
        }
    }
    map
}
```

Note: This uses `dirs_next = "2"` for the downloads directory. Add to Cargo.toml.

- [ ] **Step 2: Update Task 9 — add missing dependency**

In `src-tauri/Cargo.toml`, add:
```toml
dirs-next = "2"
```

- [ ] **Step 3: Verify compilation**

Run: `cargo check`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/m3u8/downloader.rs src-tauri/Cargo.toml
git commit -m "feat: implement M3U8 segment downloader with progress events"
```

---

### Task 14: Converter implementation (ffmpeg)

**Files:**
- Modify: `src-tauri/src/m3u8/converter.rs` (replace stub)

**Interfaces:**
- Produces: `convert_to_mp4(segments_dir: &Path, output_path: &Path, ffmpeg_path: &str) -> Result<(), String>`

- [ ] **Step 1: Write converter implementation**

Replace `src-tauri/src/m3u8/converter.rs`:

```rust
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::Command;

/// Convert downloaded TS segments to MP4 using ffmpeg concat demuxer.
pub fn convert_to_mp4(
    segments_dir: &Path,
    output_path: &Path,
    ffmpeg_path: &str,
) -> Result<(), String> {
    // Collect all .ts files sorted by filename
    let mut ts_files: Vec<_> = fs::read_dir(segments_dir)
        .map_err(|e| format!("Failed to read segments directory: {}", e))?
        .filter_map(|entry| entry.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().map(|ext| ext == "ts").unwrap_or(false))
        .collect();

    ts_files.sort();

    if ts_files.is_empty() {
        return Err("No TS segments found".to_string());
    }

    // Generate ffmpeg concat file list
    let concat_path = segments_dir.parent()
        .map(|p| p.join("filelist.txt"))
        .unwrap_or_else(|| Path::new("filelist.txt").to_path_buf());

    let mut file = fs::File::create(&concat_path)
        .map_err(|e| format!("Failed to create filelist: {}", e))?;

    writeln!(file, "ffconcat version 1.0").ok();
    for ts_file in &ts_files {
        let path_str = ts_file.to_string_lossy().replace('\\', "/");
        writeln!(file, "file '{}'", path_str)
            .map_err(|e| format!("Failed to write filelist entry: {}", e))?;
    }
    drop(file);

    // Ensure output directory exists
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    // Run ffmpeg
    let output = Command::new(ffmpeg_path)
        .arg("-f")
        .arg("concat")
        .arg("-safe")
        .arg("0")
        .arg("-i")
        .arg(&concat_path)
        .arg("-c")
        .arg("copy")
        .arg("-y") // Overwrite output
        .arg(output_path)
        .output()
        .map_err(|e| {
            format!(
                "Failed to execute ffmpeg at '{}': {}. Is ffmpeg installed?",
                ffmpeg_path, e
            )
        })?;

    // Clean up concat file
    let _ = fs::remove_file(&concat_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg failed: {}", stderr));
    }

    Ok(())
}
```

- [ ] **Step 2: Verify compilation**

Run: `cargo check`
Expected: Compiles successfully

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/m3u8/converter.rs
git commit -m "feat: implement ffmpeg TS-to-MP4 converter"
```

---

### Task 15: Integration verification + end-to-end test

**Files:** None new (verification only)

- [ ] **Step 1: Run all frontend tests**

Run: `npm run test:run`
Expected: All existing tests PASS, any new tests PASS

- [ ] **Step 2: Run all Rust tests**

Run: `cargo test`
Expected: All tests PASS (playlist: 7, decrypt: 6)

- [ ] **Step 3: Build check for Tauri**

Run: `npm run tauri build 2>&1 | Select-Object -First 100` (Windows) or `npm run tauri build 2>&1 | head -100` (Unix)
Expected: Build completes without errors (may take a while).

- [ ] **Step 4: Verify the build generated successfully**

Check that `src-tauri/target/release/` contains the built binary.

- [ ] **Step 5: Final commit (if any cleanups)**

```bash
git status
git add -A
git commit -m "chore: final integration verification and cleanup"
```

---

## Dependency Summary

### Rust crates added to `src-tauri/Cargo.toml`:
```toml
reqwest = { version = "0.12", features = ["rustls-tls", "stream", "gzip", "brotli"] }
tokio = { version = "1", features = ["full"] }
scraper = "0.20"
aes = "0.8"
cbc = "0.1"
uuid = { version = "1", features = ["v4"] }
base64 = "0.22"
url = "2"
hex = "0.4"
regex = "1"
tauri-plugin-shell = "2"
dirs-next = "2"
```

### Tauri capabilities added:
- `shell:default`, `shell:allow-execute`, `shell:allow-spawn`

### Frontend: No new dependencies (uses existing `@tauri-apps/api`, `element-plus`, `lucide-vue-next`, `pinia`, `vue-i18n`)
