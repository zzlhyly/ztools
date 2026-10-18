<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { openPath } from '@tauri-apps/plugin-opener'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { Image as ImageIcon, Upload, FolderOpen } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

const format = ref<string>(
  (() => {
    try {
      const saved = appStore.getToolInput('/image')
      if (saved) return JSON.parse(saved).format || 'jpeg'
    } catch {
      // ignore parse errors, use default
    }
    return 'jpeg'
  })(),
)
const inputPath = ref('')
const fileName = ref('')
const outputPath = ref('')
const result = ref<{
  original_size: number
  output_size: number
  width: number
  height: number
} | null>(null)
const converting = ref(false)
const error = ref('')

const formatOptions = [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' },
]

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff']

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(2)} MB`
}

function setFile(path: string) {
  const name = path.split(/[/\\]/).pop() || path
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    error.value = `Unsupported file type: .${ext}`
    return
  }
  inputPath.value = path
  fileName.value = name
  result.value = null
  outputPath.value = ''
  error.value = ''
}

async function selectFile() {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
  })
  if (typeof selected === 'string') setFile(selected)
}

let unlistenDrop: (() => void) | null = null

onMounted(async () => {
  // Windows 下 Tauri 拦截 HTML5 拖放事件，使用原生拖放事件获取真实文件路径
  unlistenDrop = await getCurrentWebview().onDragDropEvent((event) => {
    if (event.payload.type === 'drop' && event.payload.paths.length > 0) {
      setFile(event.payload.paths[0])
    }
  })
})

onUnmounted(() => {
  unlistenDrop?.()
})

async function convert() {
  if (!inputPath.value) return
  converting.value = true
  error.value = ''
  try {
    const res = await invoke<{
      output_path: string
      original_size: number
      output_size: number
      width: number
      height: number
    }>('convert_image', {
      inputPath: inputPath.value,
      outputFormat: format.value,
    })
    result.value = {
      original_size: res.original_size,
      output_size: res.output_size,
      width: res.width,
      height: res.height,
    }
    outputPath.value = res.output_path
  } catch (e: any) {
    error.value = typeof e === 'string' ? e : e?.message || 'Conversion failed'
  } finally {
    converting.value = false
  }
}

async function openOutput() {
  if (!outputPath.value) return
  try {
    await openPath(outputPath.value)
  } catch (e: any) {
    error.value = typeof e === 'string' ? e : e?.message || String(e)
  }
}

// Persist format setting
watch(format, (val) => {
  appStore.saveToolInput('/image', JSON.stringify({ format: val }))
})
</script>

<template>
  <ToolLayout :title="t('tools.image.name')">
    <template #input>
      <div class="image-input-panel">
        <div class="drop-zone" @click="selectFile">
          <Upload :size="32" />
          <p v-if="!inputPath">
            {{ t('common.dropFile') }}
          </p>
          <p v-else class="file-name">
            {{ fileName }}
          </p>
        </div>
        <div class="format-row">
          <span class="label">{{ t('common.fileFormat') }}:</span>
          <el-select v-model="format" size="small" style="width: 120px">
            <el-option
              v-for="opt in formatOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button
            type="primary"
            :icon="ImageIcon"
            :loading="converting"
            :disabled="!inputPath"
            @click="convert"
          >
            {{ t('common.convert') }}
          </el-button>
        </div>
      </div>
    </template>

    <template #output>
      <div v-if="error" class="error-msg">
        {{ error }}
      </div>
      <div v-else-if="result" class="result-panel">
        <div class="result-info">
          <p>{{ result.width }} × {{ result.height }}px</p>
          <p>{{ t('common.original') }}: {{ formatBytes(result.original_size) }}</p>
          <p>{{ t('common.converted') }}: {{ formatBytes(result.output_size) }}</p>
          <p v-if="result.original_size > 0">
            {{ t('common.reduction') }}:
            {{ ((1 - result.output_size / result.original_size) * 100).toFixed(1) }}%
          </p>
        </div>
        <el-button v-if="outputPath" type="success" :icon="FolderOpen" @click="openOutput">
          {{ t('common.openFile') }}
        </el-button>
      </div>
      <div v-else class="placeholder">
        {{ t('common.dropFile') }}
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.image-input-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl) var(--spacing-md);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
  color: var(--text-color-secondary);
}
.drop-zone:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.format-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.format-row .label {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
}
.result-info p {
  margin: var(--spacing-xs) 0;
  font-size: var(--font-size-sm);
}
.error-msg {
  color: var(--el-color-danger);
}
.placeholder {
  text-align: center;
  color: var(--text-color-secondary);
  padding: var(--spacing-xl);
}
.file-name {
  font-weight: 500;
  color: var(--text-color-primary);
}
</style>
