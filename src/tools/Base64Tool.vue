<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { base64Encode, base64Decode } from '@/utils/formatters'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Lock, Unlock, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const input = ref('')
const output = ref('')

const handleEncode = () => {
  output.value = base64Encode(input.value)
  ElMessage.success(t('common.success'))
}

const handleDecode = () => {
  try {
    output.value = base64Decode(input.value)
    ElMessage.success(t('common.success'))
  } catch {
    ElMessage.error(t('errors.invalidInput'))
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
}
</script>

<template>
  <ToolLayout :title="t('tools.base64.name')" output-copyable @copy="handleCopy">
    <template #input>
      <ToolTextarea v-model="input" :placeholder="t('common.placeholder')" submit-hotkey @submit="handleEncode" />
    </template>

    <template #actions>
      <el-button type="primary" :icon="Lock" @click="handleEncode">
        {{ t('common.encode') }}
      </el-button>
      <el-button :icon="Unlock" @click="handleDecode">
        {{ t('common.decode') }}
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
