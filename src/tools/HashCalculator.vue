<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { HASH_ALGORITHMS, type HashAlgorithm, calculateHash, hashFile } from '@/utils/hash'
import { useClipboard } from '@/composables/useClipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Hash, Trash2, FolderOpen, X } from 'lucide-vue-next'
import { open } from '@tauri-apps/plugin-dialog'

const { t } = useI18n()

const input = ref('')
const output = ref('')
const selectedFile = ref('')
const isHashing = ref(false)
const selectedAlgorithm = ref<HashAlgorithm>('SHA-256')
const lastSucceeded = ref(false)

const handleSelectFile = async () => {
  const file = await open({ multiple: false, filters: [{ name: 'All Files', extensions: ['*'] }] })
  if (file && typeof file === 'string') {
    selectedFile.value = file
    const name = file.split(/[/\\]/).pop() || file
    input.value = name
  }
}

const handleClearFile = () => {
  selectedFile.value = ''
  input.value = ''
}

const handleCalculate = async () => {
  if (isHashing.value) return

  try {
    isHashing.value = true
    output.value = ''

    if (selectedFile.value) {
      output.value = await hashFile(selectedFile.value, selectedAlgorithm.value)
    } else {
      output.value = await calculateHash(input.value, selectedAlgorithm.value)
    }

    lastSucceeded.value = true
    ElMessage.success(t('common.success'))
  } catch {
    lastSucceeded.value = false
    ElMessage.error(t('errors.invalidInput'))
  } finally {
    isHashing.value = false
  }
}

watch(selectedAlgorithm, () => {
  if (lastSucceeded.value && (input.value || selectedFile.value)) {
    handleCalculate()
  }
})

const handleCopy = useClipboard(output)

const handleClear = () => {
  input.value = ''
  output.value = ''
  selectedFile.value = ''
}
</script>

<template>
  <ToolLayout
    :title="t('tools.hash.name')"
    output-copyable
    @copy="handleCopy"
  >
    <template #input-actions>
      <el-select
        v-model="selectedAlgorithm"
        size="small"
        style="width: 140px"
      >
        <el-option
          v-for="alg in HASH_ALGORITHMS"
          :key="alg.value"
          :label="alg.label"
          :value="alg.value"
        />
      </el-select>
      <el-button
        :icon="FolderOpen"
        size="small"
        @click="handleSelectFile"
      >
        {{ t('common.selectFile') }}
      </el-button>
    </template>

    <template #input>
      <div class="hash-input-area">
        <ToolTextarea
          v-model="input"
          :placeholder="selectedFile ? '' : t('common.placeholder')"
          :readonly="!!selectedFile"
          submit-hotkey
          @submit="handleCalculate"
        />
        <div
          v-if="selectedFile"
          class="file-indicator"
        >
          <span class="file-path">{{ selectedFile }}</span>
          <el-button
            :icon="X"
            size="small"
            circle
            @click="handleClearFile"
          />
        </div>
      </div>
    </template>

    <template #actions>
      <el-button
        type="primary"
        :icon="Hash"
        :loading="isHashing"
        @click="handleCalculate"
      >
        {{ isHashing ? t('common.hashing') : t('common.calculate') }}
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

<style scoped>
.hash-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  height: 100%;
}

.file-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  background: var(--bg-color-page, #f5f7fa);
  border-radius: var(--radius-md, 8px);
  font-size: var(--font-size-sm, 13px);
}

.file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-color-regular, #606266);
}
</style>
