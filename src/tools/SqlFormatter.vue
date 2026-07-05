<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { format } from 'sql-formatter'
import { Play, Trash2 } from 'lucide-vue-next'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const input = ref('')
const output = ref('')
const error = ref('')
const formatError = ref(false)

const handleFormat = () => {
  error.value = ''
  formatError.value = false
  if (!input.value.trim()) {
    ElMessage.warning(t('errors.invalidInput'))
    return
  }
  try {
    output.value = format(input.value, {
      language: 'sql',
      keywordCase: 'upper',
    })
    ElMessage.success(t('common.success'))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = message
    formatError.value = true
    output.value = input.value
    ElMessage.error(message)
  }
}

const handleClear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
  formatError.value = false
}

// Tool input memory
onMounted(() => {
  input.value = appStore.getToolInput(route.path)
})

watch(input, (val) => {
  appStore.saveToolInput(route.path, val)
})
</script>

<template>
  <ToolLayout :title="t('tools.sql.name')">
    <template #input>
      <ToolTextarea
        v-model="input"
        :placeholder="t('common.placeholder')"
        submit-hotkey
        @submit="handleFormat"
      />
    </template>

    <template #actions>
      <el-button type="primary" :icon="Play" @click="handleFormat">
        {{ t('common.format') }}
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <el-alert v-if="error" :title="error" type="warning" :closable="false" show-icon />
      <CodeOutput :content="output" :error="formatError ? '' : error" language="sql" />
    </template>
  </ToolLayout>
</template>
