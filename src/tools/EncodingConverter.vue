<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { openPath } from '@tauri-apps/plugin-opener'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { Upload, FolderOpen } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

const targetEncoding = ref(appStore.getToolInput('/encoding') || 'UTF-8')
const inputPath = ref('')
const fileName = ref('')
const detectedEncoding = ref('')
const hasBom = ref(false)
const outputPath = ref('')
const hadErrors = ref(false)
const converting = ref(false)
const error = ref('')

const encodingOptions = [
  { label: 'UTF-8', value: 'UTF-8' },
  { label: 'GBK', value: 'GBK' },
  { label: 'GB2312', value: 'GB2312' },
  { label: 'Shift-JIS', value: 'Shift_JIS' },
  { label: 'EUC-JP', value: 'EUC-JP' },
  { label: 'EUC-KR', value: 'EUC-KR' },
  { label: 'Big5', value: 'Big5' },
  { label: 'ISO-8859-1', value: 'ISO-8859-1' },
  { label: 'Windows-1252', value: 'windows-1252' },
]

function setFile(path: string) {
  fileName.value = path.split(/[/\\]/).pop() || path
  inputPath.value = path
  outputPath.value = ''
  detectedEncoding.value = ''
  hasBom.value = false
  error.value = ''
  detect()
}

async function selectFile() {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: 'Text',
        extensions: ['txt', 'csv', 'log', 'json', 'xml', 'yaml', 'yml', 'md', 'ini', 'conf'],
      },
    ],
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

async function detect() {
  if (!inputPath.value) return
  try {
    const res = await invoke<{ encoding: string; has_bom: boolean }>('detect_encoding', {
      filePath: inputPath.value,
    })
    detectedEncoding.value = res.encoding
    hasBom.value = res.has_bom
  } catch (e: any) {
    error.value = typeof e === 'string' ? e : e?.message || 'Detection failed'
  }
}

async function convert() {
  if (!inputPath.value) return
  converting.value = true
  error.value = ''
  try {
    const res = await invoke<{
      output_path: string
      source_encoding: string
      had_errors: boolean
    }>('convert_encoding', {
      filePath: inputPath.value,
      targetEncoding: targetEncoding.value,
    })
    outputPath.value = res.output_path
    hadErrors.value = res.had_errors
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

function onTargetChange(val: string) {
  appStore.saveToolInput('/encoding', val)
}
</script>

<template>
  <ToolLayout :title="t('tools.encoding.name')">
    <template #input>
      <div class="encoding-input-panel">
        <div class="drop-zone" @click="selectFile">
          <Upload :size="32" />
          <p v-if="!inputPath">
            {{ t('common.dropFile') }}
          </p>
          <p v-else class="file-name">
            {{ fileName }}
          </p>
        </div>
        <div v-if="detectedEncoding" class="detected-info">
          {{ t('common.detected') }}: {{ detectedEncoding }}{{ hasBom ? ' (BOM)' : '' }}
        </div>
        <div class="convert-row">
          <span class="label">{{ t('common.targetEncoding') }}:</span>
          <el-select
            v-model="targetEncoding"
            size="small"
            style="width: 140px"
            @change="onTargetChange"
          >
            <el-option
              v-for="opt in encodingOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button type="primary" :loading="converting" :disabled="!inputPath" @click="convert">
            {{ t('common.convert') }}
          </el-button>
        </div>
      </div>
    </template>

    <template #output>
      <div v-if="error" class="error-msg">
        {{ error }}
      </div>
      <div v-else-if="outputPath" class="result-panel">
        <p v-if="hadErrors" class="warning-msg">
          {{ t('common.encodingWarning') }}
        </p>
        <p v-else>
          {{ t('common.conversionSuccess') }}
        </p>
        <p class="output-path">
          {{ outputPath }}
        </p>
        <el-button type="success" :icon="FolderOpen" @click="openOutput">
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
.encoding-input-panel {
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
.convert-row,
.detected-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}
.label {
  color: var(--text-color-secondary);
}
.error-msg {
  color: var(--el-color-danger);
}
.warning-msg {
  color: var(--el-color-warning);
}
.file-name {
  font-weight: 500;
  color: var(--text-color-primary);
}
.output-path {
  font-size: var(--font-size-xs);
  color: var(--text-color-secondary);
  word-break: break-all;
}
.placeholder {
  text-align: center;
  color: var(--text-color-secondary);
  padding: var(--spacing-xl);
}
.result-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style>
