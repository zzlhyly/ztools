<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import yaml from 'js-yaml'
import { ArrowLeftRight, Play, Trash2 } from 'lucide-vue-next'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

type Direction = 'yaml2json' | 'json2yaml'

const input = ref('')
const output = ref('')
const error = ref('')
const direction = ref<Direction>('yaml2json')

const toggleDirection = () => {
  direction.value = direction.value === 'yaml2json' ? 'json2yaml' : 'yaml2json'
  output.value = ''
  error.value = ''
}

const handleConvert = () => {
  error.value = ''
  if (!input.value.trim()) {
    ElMessage.warning(t('errors.invalidInput'))
    return
  }
  try {
    if (direction.value === 'yaml2json') {
      const obj = yaml.load(input.value)
      output.value = JSON.stringify(obj, null, 2)
    } else {
      const obj = JSON.parse(input.value)
      output.value = yaml.dump(obj)
    }
    ElMessage.success(t('common.success'))
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    error.value = message
    ElMessage.error(message)
  }
}

const handleClear = () => {
  input.value = ''
  output.value = ''
  error.value = ''
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
  <ToolLayout :title="t('tools.yaml.name')">
    <template #input-actions>
      <el-button :icon="ArrowLeftRight" @click="toggleDirection">
        {{ direction === 'yaml2json' ? 'YAML → JSON' : 'JSON → YAML' }}
      </el-button>
    </template>

    <template #input>
      <ToolTextarea
        v-model="input"
        :placeholder="t('common.placeholder')"
        submit-hotkey
        @submit="handleConvert"
      />
    </template>

    <template #actions>
      <el-button type="primary" :icon="Play" @click="handleConvert">
        {{ t('common.convert') }}
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <CodeOutput
        :content="output"
        :error="error"
        :language="direction === 'yaml2json' ? 'json' : 'yaml'"
      />
    </template>
  </ToolLayout>
</template>
