<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { calculateHash } from '@/utils/hash'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Hash, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const input = ref('')
const output = ref('')

const handleCalculate = async () => {
  try {
    const sha1 = await calculateHash(input.value, 'SHA-1')
    const sha256 = await calculateHash(input.value, 'SHA-256')
    const sha384 = await calculateHash(input.value, 'SHA-384')
    const sha512 = await calculateHash(input.value, 'SHA-512')

    output.value = `SHA-1:\n${sha1}\n\nSHA-256:\n${sha256}\n\nSHA-384:\n${sha384}\n\nSHA-512:\n${sha512}`
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
  <ToolLayout :title="t('tools.hash.name')" output-copyable @copy="handleCopy">
    <template #input>
      <ToolTextarea v-model="input" :placeholder="t('common.placeholder')" />
    </template>

    <template #actions>
      <el-button type="primary" :icon="Hash" @click="handleCalculate">
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
