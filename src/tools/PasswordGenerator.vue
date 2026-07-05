<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { copyToClipboard } from '@/utils/clipboard'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Key, Copy, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

const STORAGE_KEY = '/password'

const length = ref(16)
const useUpper = ref(true)
const useLower = ref(true)
const useDigits = ref(true)
const useSymbols = ref(true)
const output = ref('')

// Restore settings
const saved = appStore.getToolInput(STORAGE_KEY)
if (saved) {
  try {
    const parsed = JSON.parse(saved)
    if (parsed.length != null) length.value = parsed.length
    if (parsed.useUpper != null) useUpper.value = parsed.useUpper
    if (parsed.useLower != null) useLower.value = parsed.useLower
    if (parsed.useDigits != null) useDigits.value = parsed.useDigits
    if (parsed.useSymbols != null) useSymbols.value = parsed.useSymbols
  } catch {
    /* ignore parse errors */
  }
}

// Save settings on change
watch([length, useUpper, useLower, useDigits, useSymbols], () => {
  appStore.saveToolInput(
    STORAGE_KEY,
    JSON.stringify({
      length: length.value,
      useUpper: useUpper.value,
      useLower: useLower.value,
      useDigits: useDigits.value,
      useSymbols: useSymbols.value,
    }),
  )
})

const charset = computed(() => {
  let chars = ''
  if (useUpper.value) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (useLower.value) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (useDigits.value) chars += '0123456789'
  if (useSymbols.value) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  return chars
})

const hasCharset = computed(() => charset.value.length > 0)

const entropy = computed(() => {
  if (!output.value) return 0
  return Math.log2(Math.pow(charset.value.length, length.value))
})

const entropyStyle = computed(() => {
  const e = entropy.value
  if (e >= 100) return { color: '#67c23a', label: 'Strong' }
  if (e >= 80) return { color: '#e6a23c', label: 'Good' }
  if (e >= 60) return { color: '#f56c6c', label: 'Weak' }
  return { color: '#f56c6c', label: 'Very Weak' }
})

const handleGenerate = () => {
  if (!hasCharset.value) {
    ElMessage.warning('Select at least one character set')
    return
  }
  const chars = charset.value
  const array = new Uint32Array(length.value)
  crypto.getRandomValues(array)
  let password = ''
  for (let i = 0; i < length.value; i++) {
    password += chars[array[i] % chars.length]
  }
  output.value = password
}

const handleCopy = async () => {
  if (!output.value) return
  await copyToClipboard(output.value)
  ElMessage.success('Copied!')
}

const handleClear = () => {
  output.value = ''
}
</script>

<template>
  <ToolLayout :title="t('tools.password.name')">
    <template #input>
      <div class="password-settings">
        <div class="setting-row">
          <label class="setting-label">Length: {{ length }}</label>
          <el-slider v-model="length" :min="8" :max="128" :step="1" show-input />
        </div>
        <div class="checkbox-group">
          <el-checkbox v-model="useUpper" label="A-Z (Uppercase)" />
          <el-checkbox v-model="useLower" label="a-z (Lowercase)" />
          <el-checkbox v-model="useDigits" label="0-9 (Digits)" />
          <el-checkbox v-model="useSymbols" label="!@#$ (Symbols)" />
        </div>
      </div>
    </template>

    <template #actions>
      <el-button type="primary" :icon="Key" @click="handleGenerate">
        {{ t('common.generate') }}
      </el-button>
      <el-button :icon="Copy" @click="handleCopy">
        {{ t('common.copy') }}
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <div class="password-output">
        <div v-if="output" class="entropy-bar">
          <span class="entropy-text" :style="{ color: entropyStyle.color }">
            ~{{ Math.round(entropy) }} bits — {{ entropyStyle.label }}
          </span>
          <div class="entropy-track">
            <div
              class="entropy-fill"
              :style="{
                width: (Math.min(entropy, 128) / 128) * 100 + '%',
                background: entropyStyle.color,
              }"
            />
          </div>
        </div>
        <CodeOutput :content="output" language="text" />
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.password-settings {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 16px);
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.setting-label {
  font-size: var(--font-size-sm, 13px);
  font-weight: 500;
  color: var(--text-color-regular, #606266);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm, 8px);
}

.password-output {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  height: 100%;
}

.entropy-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entropy-text {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
}

.entropy-track {
  height: 4px;
  background: var(--border-color, #dcdfe6);
  border-radius: 2px;
  overflow: hidden;
}

.entropy-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}
</style>
