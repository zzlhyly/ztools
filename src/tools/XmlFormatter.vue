<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { formatXml, validateXml } from '@/utils/formatters'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Code, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const input = ref('')
const output = ref('')
const error = ref('')

const handleFormat = () => {
  error.value = ''
  try {
    if (!validateXml(input.value)) {
      throw new Error('Invalid XML')
    }
    output.value = formatXml(input.value)
    ElMessage.success(t('common.success'))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = message
    ElMessage.error(t('errors.xmlSyntax'))
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
  <ToolLayout :title="t('tools.xml.name')" output-copyable @copy="handleCopy">
    <template #input>
      <ToolTextarea v-model="input" :placeholder="t('common.placeholder')" submit-hotkey @submit="handleFormat" />
    </template>

    <template #actions>
      <el-button type="primary" :icon="Code" @click="handleFormat">
        {{ t('common.format') }}
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <CodeOutput :content="output" :error="error" language="xml" />
    </template>
  </ToolLayout>
</template>
