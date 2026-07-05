<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { Upload, Download } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

const targetEncoding = ref(appStore.getToolInput('/encoding') || 'UTF-8')
const inputFile = ref<File | null>(null)
const fileName = ref('')
const detectedEncoding = ref('')
const confidence = ref(0)
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

async function onFileDrop(e: DragEvent) {
  e.preventDefault()
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return
  inputFile.value = files[0]
  fileName.value = files[0].name
  outputPath.value = ''
  error.value = ''
  await detect()
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

async function detect() {
  if (!inputFile.value) return
  try {
    const path = (inputFile.value as any).path || (inputFile.value as any).name
    const res = await invoke<{ encoding: string; confidence: number }>('detect_encoding', {
      filePath: path,
    })
    detectedEncoding.value = res.encoding
    confidence.value = res.confidence
  } catch (e: any) {
    error.value = typeof e === 'string' ? e : e?.message || 'Detection failed'
  }
}

async function convert() {
  if (!inputFile.value) return
  converting.value = true
  error.value = ''
  try {
    const path = (inputFile.value as any).path || (inputFile.value as any).name
    const res = await invoke<{
      output_path: string
      source_encoding: string
      had_errors: boolean
    }>('convert_encoding', {
      filePath: path,
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

function onTargetChange(val: string) {
  appStore.saveToolInput('/encoding', val)
}
</script>

<template>
  <ToolLayout :title="t('tools.encoding.name')">
    <template #input>
      <div class="encoding-input-panel">
        <div class="drop-zone" @drop="onFileDrop" @dragover="onDragOver">
          <Upload :size="32" />
          <p v-if="!inputFile">
            {{ t('common.dropFile') || 'Drop a text file here' }}
          </p>
          <p v-else class="file-name">
            {{ fileName }}
          </p>
        </div>
        <div v-if="detectedEncoding" class="detected-info">
          {{ t('common.detected') || 'Detected' }}: {{ detectedEncoding }} ({{
            t('common.confidence') || 'confidence'
          }}: {{ confidence }})
        </div>
        <div class="convert-row">
          <span class="label">{{ t('common.targetEncoding') || 'Target' }}:</span>
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
          <el-button type="primary" :loading="converting" :disabled="!inputFile" @click="convert">
            {{ t('common.convert') || 'Convert' }}
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
          {{ t('common.encodingWarning') || 'Some characters could not be mapped.' }}
        </p>
        <p v-else>
          {{ t('common.conversionSuccess') || 'Conversion successful!' }}
        </p>
        <p class="output-path">
          {{ outputPath }}
        </p>
        <el-button type="success" :icon="Download">
          {{ t('common.download') || 'Download' }}
        </el-button>
      </div>
      <div v-else class="placeholder">
        {{ t('common.dropFile') || 'Drop a text file to detect encoding' }}
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
