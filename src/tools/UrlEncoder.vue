<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { urlEncode, urlDecode } from '@/utils/formatters'
import { useClipboard } from '@/composables/useClipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Link, Unlink, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const input = ref('')
const output = ref('')

const handleEncode = () => {
  output.value = urlEncode(input.value)
  ElMessage.success(t('common.success'))
}

const handleDecode = () => {
  try {
    output.value = urlDecode(input.value)
    ElMessage.success(t('common.success'))
  } catch {
    ElMessage.error(t('errors.invalidInput'))
  }
}

const handleCopy = useClipboard(output)

const handleClear = () => {
  input.value = ''
  output.value = ''
}
</script>

<template>
  <ToolLayout
    :title="t('tools.url.name')"
    output-copyable
    @copy="handleCopy"
  >
    <template #input>
      <ToolTextarea
        v-model="input"
        :placeholder="t('common.placeholder')"
        submit-hotkey
        @submit="handleEncode"
      />
    </template>

    <template #actions>
      <el-button
        type="primary"
        :icon="Link"
        @click="handleEncode"
      >
        {{ t('common.encode') }}
      </el-button>
      <el-button
        :icon="Unlink"
        @click="handleDecode"
      >
        {{ t('common.decode') }}
      </el-button>
      <el-button
        :icon="Trash2"
        @click="handleClear"
      >
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <CodeOutput
        :content="output"
        language="text"
      />
    </template>
  </ToolLayout>
</template>
