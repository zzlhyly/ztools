<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Braces, Trash2 } from 'lucide-vue-next'
import { formatJson, minifyJson, validateJson } from '@/utils/formatters'
import { useClipboard } from '@/composables/useClipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'

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

const handleCopy = useClipboard(output)

const handleClear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
}
</script>

<template>
  <ToolLayout
    :title="t('tools.json.name')"
    output-copyable
    @copy="handleCopy"
  >
    <template #input>
      <ToolTextarea v-model="input" :placeholder="t('common.placeholder')" submit-hotkey @submit="handleFormat" />
    </template>

    <template #actions>
      <el-button type="primary" :icon="Braces" @click="handleFormat">
        {{ t('common.format') }}
      </el-button>
      <el-button :icon="Braces" @click="handleMinify">
        {{ t('common.minify') }}
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <CodeOutput :content="output" :error="error" language="json" />
    </template>
  </ToolLayout>
</template>