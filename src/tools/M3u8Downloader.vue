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
  invokeGetDefaultDownloadDir,
  onDownloadProgress,
  onDownloadComplete,
  onDownloadError,
  type M3u8Info,
  type DownloadConfig,
} from '@/utils/m3u8'
import DownloadProgress from '@/components/DownloadProgress.vue'
import { Download, Trash2, RotateCcw, X, Upload, FolderOpen, FileSearch } from 'lucide-vue-next'
import { open } from '@tauri-apps/plugin-dialog'

const { t } = useI18n()
const store = useM3u8Store()

const urlInput = ref('')
const curlInput = ref('')
const showCurlInput = ref(false)
const showHeadersConfig = ref(false)
const showQualitySelect = ref(false)
const qualityOptions = ref<M3u8Info[]>([])

const activeTasks = computed(() =>
  store.tasks.filter(
    (t) => t.status === 'downloading' || t.status === 'converting' || t.status === 'parsing',
  ),
)

const completedTasks = computed(() =>
  store.tasks.filter(
    (t) => t.status === 'done' || t.status === 'error' || t.status === 'cancelled',
  ),
)

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
      status: event.percent === 100 ? 'converting' : 'downloading',
    })
  })
  unlistenComplete = await onDownloadComplete((event) => {
    store.updateTask(event.task_id, {
      status: 'done',
      progress: 100,
      speed: '',
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

  // Set default download directory if not configured
  if (!store.config.downloadDir) {
    const dir = await invokeGetDefaultDownloadDir()
    if (dir) {
      store.updateConfig({ downloadDir: dir })
    }
  }
})

onUnmounted(() => {
  unlistenProgress?.()
  unlistenComplete?.()
  unlistenError?.()
})

function isDirectUrl(url: string): boolean {
  return url.endsWith('.m3u8') || url.includes('.m3u8?')
}

function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href
  } catch {
    return relativeUrl
  }
}

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

function handleCurlPaste() {
  const result = parseCurlCommand(curlInput.value)
  if (!result) {
    ElMessage.error('Invalid cURL command')
    return
  }
  urlInput.value = result.url
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
  const customHeaders = Object.entries(result.headers)
    .filter(([k]) => k !== 'Referer' && k !== 'Cookie')
    .map(([key, value]) => ({ key, value }))
  if (customHeaders.length > 0) {
    store.updateConfig({ headers: { ...store.config.headers, custom: customHeaders } })
  }
  ElMessage.success('Headers extracted from cURL')
}

async function handleSelectDownloadDir() {
  const selected = await open({ directory: true, multiple: false })
  if (selected && typeof selected === 'string') {
    store.updateConfig({ downloadDir: selected })
  }
}

async function handleSelectFfmpegPath() {
  const selected = await open({ multiple: false, filters: [] })
  if (selected && typeof selected === 'string') {
    store.updateConfig({ ffmpegPath: selected })
  }
}

async function handleAddTask() {
  const url = urlInput.value.trim()
  if (!url) return

  const inputMode = isDirectUrl(url) ? 'direct' : 'webpage'
  const headers = buildHeaders()

  if (inputMode === 'direct') {
    await startFromDirectUrl(url, headers)
  } else {
    await startFromWebpage(url, headers)
  }
}

async function startFromDirectUrl(url: string, headers: Record<string, string>) {
  const task = store.addTask(url, 'direct')
  task.m3u8Url = url

  try {
    const result = await invokeParseM3u8(url, headers)
    if (result.playlist_type === 'master' && result.qualities.length > 0) {
      const resolvedQualities = result.qualities.map((q) => ({
        ...q,
        url: resolveUrl(q.url, url),
      }))
      store.updateTask(task.id, { qualityOptions: resolvedQualities })

      if (resolvedQualities.length > 1) {
        store.updateTask(task.id, { status: 'selecting_quality' })
        qualityOptions.value = [{ url, label: 'Master Playlist', qualities: resolvedQualities }]
        showQualitySelect.value = true
        return
      }

      // Auto-select single quality
      const qualityUrl = resolvedQualities[0].url
      store.updateTask(task.id, {
        m3u8Url: qualityUrl,
        title: extractFilename(url),
        quality: resolvedQualities[0].resolution,
      })
      await doStartDownload(task, qualityUrl, store.config.downloadDir)
      return
    }
    await doStartDownload(task, url, store.config.downloadDir)
  } catch (err: any) {
    store.updateTask(task.id, { status: 'error', error: String(err) })
    ElMessage.error(String(err))
  }
}

async function startFromWebpage(url: string, headers: Record<string, string>) {
  const task = store.addTask(url, 'webpage')

  try {
    store.updateTask(task.id, { status: 'parsing' })
    const pageResult = await invokeFetchPage(url, headers)
    const m3u8List = await invokeParseM3u8Urls(pageResult.html, pageResult.final_url)

    if (m3u8List.length === 0) {
      store.updateTask(task.id, {
        status: 'error',
        error: t('common.noM3u8Found'),
      })
      ElMessage.warning(t('common.noM3u8Found'))
      return
    }

    const firstM3u8 = m3u8List[0]
    const playlist = await invokeParseM3u8(firstM3u8.url, headers)

    if (playlist.playlist_type === 'master' && playlist.qualities.length > 0) {
      const resolvedQualities = playlist.qualities.map((q) => ({
        ...q,
        url: resolveUrl(q.url, firstM3u8.url),
      }))
      store.updateTask(task.id, {
        m3u8Url: firstM3u8.url,
        qualityOptions: resolvedQualities,
      })

      if (resolvedQualities.length > 1) {
        store.updateTask(task.id, { status: 'selecting_quality' })
        qualityOptions.value = m3u8List.map((item) => ({
          ...item,
          qualities: item.qualities.map((q) => ({
            ...q,
            url: resolveUrl(q.url, item.url),
          })),
        }))
        showQualitySelect.value = true
        return
      }

      // Auto-select single quality
      const qualityUrl = resolvedQualities[0].url
      store.updateTask(task.id, {
        m3u8Url: qualityUrl,
        title: firstM3u8.label || extractFilename(url),
        quality: resolvedQualities[0].resolution,
      })
      await doStartDownload(task, qualityUrl, store.config.downloadDir)
      return
    }

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

function generateFilename(task: M3u8Task, _outputDir: string): string {
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
    // User clicked cancel on dialog
  }
}

async function handleRetryTask(taskId: string) {
  const task = store.tasks.find((t) => t.id === taskId)
  if (!task) return

  store.retryTask(taskId)
  await doStartDownload(task, task.m3u8Url || task.url, store.config.downloadDir)
}

function handleRemoveTask(taskId: string) {
  store.removeTask(taskId)
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (activeTasks.value.length > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="m3u8-downloader">
    <h2 class="tool-title">
      {{ t('tools.m3u8.name') }}
    </h2>

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
        <el-tooltip
          content="从浏览器 DevTools 复制 cURL 命令并粘贴，自动提取 URL 和 Headers"
          placement="bottom"
        >
          <el-button text size="small" @click="showCurlInput = !showCurlInput">
            {{ t('common.curlPaste') }}
          </el-button>
        </el-tooltip>
        <el-tooltip content="配置请求头（Referer、Cookie 等）" placement="bottom">
          <el-button text size="small" @click="showHeadersConfig = !showHeadersConfig">
            {{ t('common.headers') }}
          </el-button>
        </el-tooltip>
      </div>

      <div v-if="showCurlInput" class="curl-section">
        <el-input
          v-model="curlInput"
          type="textarea"
          :rows="3"
          placeholder="curl 'https://...' -H 'Referer: ...' -H 'Cookie: ...'"
        />
        <el-button size="small" :icon="Upload" style="margin-top: 8px" @click="handleCurlPaste">
          {{ t('common.curlPaste') }}
        </el-button>
      </div>

      <div v-if="showHeadersConfig" class="headers-config">
        <table class="headers-table">
          <thead>
            <tr>
              <th class="col-key">Key</th>
              <th class="col-value">Value</th>
              <th class="col-action" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="header-key-label">Referer</span></td>
              <td>
                <el-input
                  :model-value="store.config.headers.referer"
                  placeholder="https://example.com/"
                  size="small"
                  @update:model-value="
                    (v: string) =>
                      store.updateConfig({ headers: { ...store.config.headers, referer: v } })
                  "
                />
              </td>
              <td />
            </tr>
            <tr>
              <td><span class="header-key-label">Cookie</span></td>
              <td>
                <el-input
                  :model-value="store.config.headers.cookie"
                  placeholder="session=abc123"
                  size="small"
                  @update:model-value="
                    (v: string) =>
                      store.updateConfig({ headers: { ...store.config.headers, cookie: v } })
                  "
                />
              </td>
              <td />
            </tr>
            <tr v-for="(item, index) in store.config.headers.custom" :key="index">
              <td>
                <el-input
                  :model-value="item.key"
                  placeholder="Header Name"
                  size="small"
                  @update:model-value="
                    (v: string) => {
                      const c = [...store.config.headers.custom]
                      c[index] = { key: v, value: c[index]?.value || '' }
                      store.updateConfig({ headers: { ...store.config.headers, custom: c } })
                    }
                  "
                />
              </td>
              <td>
                <el-input
                  :model-value="item.value"
                  placeholder="Header Value"
                  size="small"
                  @update:model-value="
                    (v: string) => {
                      const c = [...store.config.headers.custom]
                      c[index] = { key: c[index]?.key || '', value: v }
                      store.updateConfig({ headers: { ...store.config.headers, custom: c } })
                    }
                  "
                />
              </td>
              <td>
                <el-button
                  :icon="X"
                  size="small"
                  circle
                  @click="
                    () => {
                      const c = store.config.headers.custom.filter(
                        (_: any, i: number) => i !== index,
                      )
                      store.updateConfig({ headers: { ...store.config.headers, custom: c } })
                    }
                  "
                />
              </td>
            </tr>
          </tbody>
        </table>
        <el-button
          size="small"
          style="margin-top: 8px"
          @click="
            () =>
              store.updateConfig({
                headers: {
                  ...store.config.headers,
                  custom: [...store.config.headers.custom, { key: '', value: '' }],
                },
              })
          "
        >
          + 添加 Header
        </el-button>
      </div>

      <div class="config-row">
        <div class="config-item">
          <label>{{ t('common.downloadDir') }}</label>
          <div class="path-input-row">
            <el-input
              :model-value="store.config.downloadDir"
              size="small"
              placeholder="选择下载目录"
              @update:model-value="(v: string) => store.updateConfig({ downloadDir: v })"
            />
            <el-tooltip content="选择文件夹" placement="top">
              <el-button :icon="FolderOpen" size="small" @click="handleSelectDownloadDir" />
            </el-tooltip>
          </div>
        </div>
        <div class="config-item">
          <label>{{ t('common.ffmpegPath') }}</label>
          <div class="path-input-row">
            <el-input
              :model-value="store.config.ffmpegPath"
              size="small"
              placeholder="ffmpeg 路径"
              @update:model-value="(v: string) => store.updateConfig({ ffmpegPath: v })"
            />
            <el-tooltip content="选择 FFmpeg 可执行文件" placement="top">
              <el-button :icon="FileSearch" size="small" @click="handleSelectFfmpegPath" />
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="showQualitySelect" :title="t('common.selectQuality')" width="400px">
      <div class="quality-list">
        <div
          v-for="q in store.tasks.find((t) => t.status === 'selecting_quality')?.qualityOptions ||
          []"
          :key="q.url"
          class="quality-item"
          @click="handleSelectQuality(q.url, q.resolution)"
        >
          <span>{{ q.resolution || `${q.bandwidth / 1000}k` }}</span>
          <span class="quality-bandwidth">{{ (q.bandwidth / 1000).toFixed(0) }} kbps</span>
        </div>
      </div>
    </el-dialog>

    <div class="task-list">
      <div v-if="activeTasks.length > 0" class="task-section">
        <div class="section-title">
          {{ t('common.activeDownloads') }}
        </div>
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

      <div v-if="completedTasks.length > 0" class="task-section">
        <div class="section-title">
          {{ t('common.history') }}
        </div>
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
              v-if="
                task.status === 'error' || task.status === 'cancelled' || task.status === 'done'
              "
              :icon="RotateCcw"
              size="small"
              circle
              @click="handleRetryTask(task.id)"
            />
            <el-button :icon="Trash2" size="small" circle @click="handleRemoveTask(task.id)" />
          </div>
        </div>
      </div>

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

.headers-table {
  width: 100%;
  border-collapse: collapse;
}

.headers-table th {
  text-align: left;
  font-size: var(--font-size-xs, 12px);
  font-weight: 600;
  color: var(--text-color-secondary, #909399);
  padding: 6px 8px 4px;
  border-bottom: 1px solid var(--border-color-light, #e4e7ed);
}

.headers-table td {
  padding: 4px 8px;
  vertical-align: middle;
}

.col-key {
  width: 35%;
}
.col-value {
  flex: 1;
}
.col-action {
  width: 40px;
}

.path-input-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.path-input-row .el-input {
  flex: 1;
}

.header-key-label {
  font-size: var(--font-size-xs, 12px);
  font-weight: 600;
  color: var(--text-color-regular, #606266);
  padding: 0 8px;
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
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
