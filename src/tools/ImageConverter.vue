<script setup lang="ts">
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { Image as ImageIcon, Upload, Download } from 'lucide-vue-next'

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
const inputFile = ref<File | null>(null)
const fileName = ref('')
const fileInfo = ref('')
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(2)} MB`
}

async function onFileDrop(e: DragEvent) {
  e.preventDefault()
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  inputFile.value = files[0]
  fileName.value = files[0].name
  fileInfo.value = `${files[0].name} — ${formatBytes(files[0].size)}`
  result.value = null
  outputPath.value = ''
  error.value = ''
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

async function selectFile() {
  try {
    const selected = await (window as any).__TAURI__?.dialog?.open?.({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    })
    if (selected) {
      const path = typeof selected === 'string' ? selected : selected[0]
      fileName.value = path.split(/[/\\]/).pop() || path
      fileInfo.value = fileName.value
      inputFile.value = { name: fileName.value, path } as any
      result.value = null
      error.value = ''
    }
  } catch {
    // dialog not available — use drag-drop only
  }
}

async function convert() {
  if (!inputFile.value) return
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
      inputPath: (inputFile.value as any).path || (inputFile.value as any).name,
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

// Persist format setting
watch(format, (val) => {
  appStore.saveToolInput('/image', JSON.stringify({ format: val }))
})
</script>

<template>
  <ToolLayout :title="t('tools.image.name')">
    <template #input>
      <div class="image-input-panel">
        <div class="drop-zone" @drop="onFileDrop" @dragover="onDragOver" @click="selectFile">
          <Upload :size="32" />
          <p v-if="!inputFile">
            {{ t('common.dropFile') || 'Drop image here or click to select' }}
          </p>
          <p v-else class="file-name">
            {{ fileInfo }}
          </p>
        </div>
        <div class="format-row">
          <span class="label">{{ t('common.format') || 'Format' }}:</span>
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
            :disabled="!inputFile"
            @click="convert"
          >
            {{ t('common.convert') || 'Convert' }}
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
          <p>{{ t('common.original') || 'Original' }}: {{ formatBytes(result.original_size) }}</p>
          <p>{{ t('common.converted') || 'Converted' }}: {{ formatBytes(result.output_size) }}</p>
          <p v-if="result.original_size > 0">
            {{ t('common.reduction') || 'Saved' }}:
            {{ ((1 - result.output_size / result.original_size) * 100).toFixed(1) }}%
          </p>
        </div>
        <el-button
          v-if="outputPath"
          type="success"
          :icon="Download"
          @click="
            () => {
              /* open in system */
            }
          "
        >
          {{ t('common.download') || 'Download' }}
        </el-button>
      </div>
      <div v-else class="placeholder">
        {{ t('common.dropFile') || 'Drop an image to get started' }}
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
