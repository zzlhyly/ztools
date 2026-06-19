<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { formatJson, minifyJson, validateJson } from '@/utils/formatters'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import { Braces, Copy, Trash2 } from 'lucide-vue-next'

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
  <ToolLayout :title="t('tools.json.name')">
    <template #input>
      <textarea
        v-model="input"
        class="json-input"
        :placeholder="t('common.placeholder')"
      />
    </template>

    <template #actions>
      <button class="action-button format-button" @click="handleFormat">
        <Braces :size="16" />
        {{ t('common.format') }}
      </button>
      <button class="action-button minify-button" @click="handleMinify">
        <Braces :size="16" />
        {{ t('common.minify') }}
      </button>
      <button class="action-button clear-button" @click="handleClear">
        <Trash2 :size="16" />
        {{ t('common.clear') }}
      </button>
    </template>

    <template #output>
      <div v-if="error" class="error-message">{{ error }}</div>
      <pre v-else class="output-content">{{ output }}</pre>
    </template>

    <template #output-actions>
      <button v-if="output" class="icon-button" @click="handleCopy">
        <Copy :size="16" />
      </button>
    </template>
  </ToolLayout>
</template>

<style scoped>
.json-input {
  width: 100%;
  height: 100%;
  min-height: 300px;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.5;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color-primary);
}

.json-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.output-content {
  padding: var(--spacing-md);
  background-color: var(--bg-color-page);
  border-radius: var(--radius-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: auto;
  max-height: 100%;
}

.error-message {
  padding: var(--spacing-md);
  background-color: #fef0f0;
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.action-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background-color: var(--bg-color);
  color: var(--text-color-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--font-size-sm);
}

.action-button:hover {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-color-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.icon-button:hover {
  background-color: var(--bg-color-page);
  color: var(--text-color-primary);
}
</style>