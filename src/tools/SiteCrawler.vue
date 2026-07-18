<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useM3u8Store } from '@/stores/m3u8'
import { invokeParseM3u8, invokeStartDownload, type DownloadConfig } from '@/utils/m3u8'
import { invokeCrawlListFromUrl, invokeCrawlVideoFromUrl, type VideoListItem } from '@/utils/site'
import { Search, Download } from 'lucide-vue-next'

const { t } = useI18n()
const m3u8Store = useM3u8Store()

const siteKey = ref('')
const urlInput = ref('')
const loading = ref(false)
const crawling = ref(false)
const videos = ref<VideoListItem[]>([])
const selectedIds = ref<Set<number>>(new Set())
const crawlProgress = ref('')

const pageSize = 50
const currentPage = ref(1)

const totalPages = computed(() => Math.ceil(videos.value.length / pageSize))
const pagedVideos = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return videos.value.slice(start, start + pageSize)
})

const allSelected = computed({
  get: () =>
    pagedVideos.value.length > 0 && pagedVideos.value.every((v) => selectedIds.value.has(v.id)),
  set: (val: boolean) => {
    for (const v of pagedVideos.value) {
      if (val) {
        selectedIds.value.add(v.id)
      } else {
        selectedIds.value.delete(v.id)
      }
    }
  },
})

const selectedCount = computed(() => selectedIds.value.size)

function extractTagId(url: string): number | null {
  const m = url.match(/\/tag\/(\d+)/)
  return m ? parseInt(m[1]) : null
}

async function handleParseList() {
  const url = urlInput.value.trim()
  if (!url) return

  const tagId = extractTagId(url)
  if (!tagId) {
    ElMessage.error('未识别的列表页 URL，需要包含 /tag/数字')
    return
  }

  loading.value = true
  videos.value = []

  try {
    const list = await invokeCrawlListFromUrl(url, tagId, siteKey.value)
    videos.value = list
    selectedIds.value = new Set()
    currentPage.value = 1
    ElMessage.success(`找到 ${list.length} 个视频`)
  } catch (err: any) {
    ElMessage.error(String(err))
  } finally {
    loading.value = false
  }
}

function getBaseUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
}

async function handleCrawlSingle(videoId: number) {
  const baseUrl = getBaseUrl(urlInput.value)
  if (!baseUrl) return

  try {
    crawlProgress.value = `正在获取 #${videoId}...`
    const pageUrl = `${baseUrl}/video-details/${videoId}`
    const result = await invokeCrawlVideoFromUrl(pageUrl, videoId, siteKey.value)

    crawlProgress.value = `解析 #${videoId}...`
    const parseResult = await invokeParseM3u8(result.m3u8_url, {})

    if (parseResult.playlist_type === 'master' && parseResult.qualities.length > 0) {
      const task = m3u8Store.addTask(result.m3u8_url, 'direct')
      const qualityUrl = parseResult.qualities[0].url.startsWith('http')
        ? parseResult.qualities[0].url
        : new URL(parseResult.qualities[0].url, result.m3u8_url).href

      m3u8Store.updateTask(task.id, {
        m3u8Url: qualityUrl,
        title: result.title,
        quality: parseResult.qualities[0].resolution,
      })

      const filename = generateFilename(result.title)
      const config: DownloadConfig = {
        task_id: task.id,
        m3u8_url: qualityUrl,
        output_dir: m3u8Store.config.downloadDir,
        filename,
        headers: {},
        ffmpeg_path: m3u8Store.config.ffmpegPath,
        max_segment_concurrent: m3u8Store.config.maxSegmentConcurrent,
      }
      await invokeStartDownload(config)
      ElMessage.success(`已添加: ${result.title}`)
    } else {
      const task = m3u8Store.addTask(result.m3u8_url, 'direct')
      m3u8Store.updateTask(task.id, {
        m3u8Url: result.m3u8_url,
        title: result.title,
        quality: 'auto',
      })

      const filename = generateFilename(result.title)
      const config: DownloadConfig = {
        task_id: task.id,
        m3u8_url: result.m3u8_url,
        output_dir: m3u8Store.config.downloadDir,
        filename,
        headers: {},
        ffmpeg_path: m3u8Store.config.ffmpegPath,
        max_segment_concurrent: m3u8Store.config.maxSegmentConcurrent,
      }
      await invokeStartDownload(config)
      ElMessage.success(`已添加: ${result.title}`)
    }
  } catch (err: any) {
    ElMessage.error(`#${videoId}: ${String(err)}`)
  }
}

function generateFilename(title: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safe = title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)
  return `${safe}_${date}.mp4`
}

async function handleDownloadSelected() {
  if (selectedIds.value.size === 0) return
  crawling.value = true

  const ids = Array.from(selectedIds.value)
  for (let i = 0; i < ids.length; i++) {
    crawlProgress.value = `(${i + 1}/${ids.length})`
    await handleCrawlSingle(ids[i])
  }

  crawling.value = false
  crawlProgress.value = ''
  ElMessage.success(`已添加 ${ids.length} 个下载任务`)
}

function toggleVideo(id: number, val: unknown) {
  if (val) {
    selectedIds.value.add(id)
  } else {
    selectedIds.value.delete(id)
  }
}

function formatDuration(sec?: number): string {
  if (!sec) return ''
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

function formatDate(d?: string): string {
  return d ? d.slice(0, 10) : ''
}
</script>

<template>
  <div class="site-crawler">
    <h2 class="tool-title">
      {{ t('tools.siteCrawler.name') }}
    </h2>

    <div class="input-section">
      <div class="input-row">
        <el-input
          v-model="siteKey"
          placeholder="站点 Key（见 sites.json）"
          size="small"
          class="site-key-input"
          clearable
        />
      </div>
      <div class="input-row">
        <el-input
          v-model="urlInput"
          placeholder="输入列表页 URL"
          clearable
          class="url-input"
          @keydown.enter="handleParseList"
        />
        <el-button type="primary" :icon="Search" :loading="loading" @click="handleParseList">
          {{ t('common.parse') }}
        </el-button>
      </div>
    </div>

    <div v-if="videos.length > 0" class="result-section">
      <div class="toolbar">
        <el-checkbox v-model="allSelected" :indeterminate="false">
          全选 ({{ selectedCount }}/{{ videos.length }})
        </el-checkbox>
        <el-button
          type="success"
          :icon="Download"
          :loading="crawling"
          :disabled="selectedCount === 0"
          @click="handleDownloadSelected"
        >
          {{ crawling ? crawlProgress : `下载选中 (${selectedCount})` }}
        </el-button>
      </div>

      <div class="video-list">
        <div
          v-for="v in pagedVideos"
          :key="v.id"
          class="video-item"
          :class="{ selected: selectedIds.has(v.id) }"
        >
          <el-checkbox
            :model-value="selectedIds.has(v.id)"
            @change="(val: unknown) => toggleVideo(v.id, val)"
          />
          <div class="video-info">
            <span class="video-name">{{ v.name || `#${v.id}` }}</span>
            <span class="video-meta">
              <template v-if="v.duration">{{ formatDuration(v.duration) }}</template>
              <template v-if="v.pubdate">{{ formatDate(v.pubdate) }}</template>
              <template v-if="v.hits">{{ (v.hits / 10000).toFixed(1) }}万次</template>
            </span>
          </div>
          <el-button
            size="small"
            :icon="Download"
            :loading="crawling && selectedIds.has(v.id)"
            @click="handleCrawlSingle(v.id)"
          >
            下载
          </el-button>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="videos.length"
          layout="prev, pager, next"
          small
        />
      </div>
    </div>

    <div v-else-if="!loading" class="empty-state">
      <Search :size="48" />
      <p>{{ t('tools.siteCrawler.description') }}</p>
    </div>
  </div>
</template>

<style scoped>
.site-crawler {
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

.site-key-input {
  width: 200px;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm, 8px) 0;
}

.video-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
}

.video-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  background: var(--surface-card, #ffffff);
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: var(--radius-md, 8px);
  transition: border-color 0.2s;
}

.video-item:hover,
.video-item.selected {
  border-color: var(--color-primary, #409eff);
}

.video-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.video-name {
  font-size: var(--font-size-sm, 13px);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-meta {
  font-size: var(--font-size-xs, 12px);
  color: var(--text-color-secondary, #909399);
  display: flex;
  gap: var(--spacing-sm, 8px);
}

.pagination {
  display: flex;
  justify-content: center;
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
