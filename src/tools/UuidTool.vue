<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { generateUuids } from '@/utils/crypto'
import { useClipboard } from '@/composables/useClipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Fingerprint, Copy, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const count = ref(1)
const output = ref('')
const isGenerating = ref(false)

const COUNTS = [1, 5, 10, 50, 100]

const handleGenerate = async () => {
  if (isGenerating.value) return
  try {
    isGenerating.value = true
    output.value = ''
    const uuids = generateUuids(count.value)
    output.value = uuids.join('\n')
    ElMessage.success(t('common.success'))
  } catch {
    ElMessage.error(t('errors.invalidInput'))
  } finally {
    isGenerating.value = false
  }
}

const handleCopyAll = useClipboard(output)

const handleClear = () => {
  output.value = ''
}
</script>

<template>
  <ToolLayout title="UUID Generator">
    <template #input-actions>
      <el-select
        v-model="count"
        size="small"
        style="width: 100px"
      >
        <el-option
          v-for="c in COUNTS"
          :key="c"
          :label="`${c}`"
          :value="c"
        />
      </el-select>
    </template>

    <template #input>
      <div class="uuid-input-area">
        <span class="version-label">UUID v4</span>
      </div>
    </template>

    <template #actions>
      <el-button
        type="primary"
        :icon="Fingerprint"
        :loading="isGenerating"
        @click="handleGenerate"
      >
        {{ t('common.generate') }}
      </el-button>
      <el-button
        :icon="Copy"
        @click="handleCopyAll"
      >
        {{ t('common.copyAll') }}
      </el-button>
      <el-button
        :icon="Trash2"
        @click="handleClear"
      >
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #output>
      <CodeOutput :content="output" />
    </template>
  </ToolLayout>
</template>

<style scoped>
.uuid-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.version-label {
  font-size: var(--font-size-sm, 13px);
  color: var(--text-color-regular, #606266);
}
</style>
