<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { computeHmac, detectKeyFormat, CryptoError } from '@/utils/crypto'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Fingerprint, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const message = ref('')
const secretKey = ref('')
const algorithm = ref('SHA-1')
const output = ref('')
const isComputing = ref(false)
const lastSucceeded = ref(false)

const ALGORITHMS = [
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-384', value: 'SHA-384' },
  { label: 'SHA-512', value: 'SHA-512' },
]

const keyFormat = computed(() => {
  if (!secretKey.value) return ''
  const format = detectKeyFormat(secretKey.value.trim())
  if (format === 'hex') return 'HEX'
  if (format === 'base64') return 'Base64'
  return 'UTF-8'
})

const handleCalculate = async () => {
  if (isComputing.value || !message.value.trim() || !secretKey.value.trim()) return
  try {
    isComputing.value = true
    output.value = ''
    output.value = await computeHmac(message.value, secretKey.value, algorithm.value)
    lastSucceeded.value = true
    ElMessage.success(t('common.success'))
  } catch (e) {
    lastSucceeded.value = false
    ElMessage.error(e instanceof CryptoError ? e.message : t('errors.invalidInput'))
  } finally {
    isComputing.value = false
  }
}

const handleCopy = async () => {
  if (output.value) {
    await copyToClipboard(output.value)
    ElMessage.success(t('common.copied'))
  }
}

const handleClear = () => {
  message.value = ''
  secretKey.value = ''
  output.value = ''
  lastSucceeded.value = false
}

watch(algorithm, () => {
  if (lastSucceeded.value && message.value.trim() && secretKey.value.trim()) {
    handleCalculate()
  }
})
</script>

<template>
  <ToolLayout :title="t('tools.hmac.name')" output-copyable @copy="handleCopy">
    <template #input-actions>
      <el-select v-model="algorithm" size="small" style="width: 140px">
        <el-option
          v-for="alg in ALGORITHMS"
          :key="alg.value"
          :label="alg.label"
          :value="alg.value"
        />
      </el-select>
    </template>

    <template #input>
      <div class="hmac-input-area">
        <ToolTextarea
          v-model="message"
          :placeholder="t('common.placeholder')"
          submit-hotkey
          @submit="handleCalculate"
        />
        <div class="key-row">
          <div class="key-field">
            <span class="key-label">{{ t('common.key') }}:</span>
            <el-input
              v-model="secretKey"
              :placeholder="t('common.keyPlaceholder')"
              size="small"
              class="key-input"
            />
            <el-tag v-if="keyFormat" size="small" type="info">{{ keyFormat }}</el-tag>
          </div>
        </div>
      </div>
    </template>

    <template #actions>
      <el-button type="primary" :icon="Fingerprint" :loading="isComputing" @click="handleCalculate">
        {{ t('common.calculate') }}
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <CodeOutput :content="output" language="text" />
    </template>
  </ToolLayout>
</template>

<style scoped>
.hmac-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  height: 100%;
}

.key-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.key-field {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  flex: 1;
}

.key-label {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  color: var(--text-color-regular, #606266);
  white-space: nowrap;
}

.key-input {
  flex: 1;
}

:deep(.key-input .el-input__wrapper) {
  font-family: var(--font-family-mono, 'Cascadia Code', 'Fira Code', monospace);
  font-size: var(--font-size-sm, 12px);
}
</style>
