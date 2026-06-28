<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { calculateHash, hashFile } from '@/utils/hash'
import { copyToClipboard } from '@/utils/clipboard'
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

const handleSelectFile = async () => {
  const file = await open({ multiple: false, filters: [{ name: 'All Files', extensions: ['*'] }] })
  if (file && typeof file === 'string') {
    selectedFile.value = file
    // Extract filename for display
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
      // File mode — stream hash via Rust
      const result = await hashFile(selectedFile.value)

      output.value = `SHA-1:\n${result.sha1}\n\nSHA-256:\n${result.sha256}\n\nSHA-384:\n${result.sha384}\n\nSHA-512:\n${result.sha512}`
    } else {
      // Text mode
      const sha1 = await calculateHash(input.value, 'SHA-1')
      const sha256 = await calculateHash(input.value, 'SHA-256')
      const sha384 = await calculateHash(input.value, 'SHA-384')
      const sha512 = await calculateHash(input.value, 'SHA-512')

      output.value = `SHA-1:\n${sha1}\n\nSHA-256:\n${sha256}\n\nSHA-384:\n${sha384}\n\nSHA-512:\n${sha512}`
    }
    ElMessage.success(t('common.success'))
  } catch {
    ElMessage.error(t('errors.invalidInput'))
  } finally {
    isHashing.value = false
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
  selectedFile.value = ''
}
</script>

<template>
  <ToolLayout :title="t('tools.hash.name')" output-copyable @copy="handleCopy">
    <template #input>
      <div class="hash-input-area">
        <ToolTextarea
          v-model="input"
          :placeholder="selectedFile ? '' : t('common.placeholder')"
          :readonly="!!selectedFile"
          submit-hotkey
          @submit="handleCalculate"
        />
        <div v-if="selectedFile" class="file-indicator">
          <span class="file-path">{{ selectedFile }}</span>
          <el-button :icon="X" size="small" circle @click="handleClearFile" />
        </div>
        <div v-else class="file-select-row">
          <el-button :icon="FolderOpen" @click="handleSelectFile">
            {{ t('common.selectFile') }}
          </el-button>
        </div>
      </div>
    </template>

    <template #actions>
      <el-button type="primary" :icon="Hash" :loading="isHashing" @click="handleCalculate">
        {{ isHashing ? t('common.hashing') : t('common.calculate') }}
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

<style scoped>
.hash-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  height: 100%;
}

.file-select-row {
  display: flex;
  gap: var(--spacing-sm, 8px);
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
