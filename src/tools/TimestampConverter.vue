<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useClipboard } from '@/composables/useClipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Clock, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const timestampInput = ref('')
const dateInput = ref('')
const output = ref('')
const unit = ref<'s' | 'ms'>('s')

const handleConvert = () => {
  try {
    if (timestampInput.value) {
      const ts = parseInt(timestampInput.value)
      if (isNaN(ts)) {
        throw new Error('Invalid timestamp')
      }
      const date = unit.value === 'ms' ? new Date(ts) : new Date(ts * 1000)
      output.value = date.toISOString()
    } else if (dateInput.value) {
      const date = new Date(dateInput.value)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      output.value =
        unit.value === 'ms'
          ? date.getTime().toString()
          : Math.floor(date.getTime() / 1000).toString()
    }
    ElMessage.success(t('common.success'))
  } catch {
    ElMessage.error(t('errors.invalidInput'))
  }
}

const handleCopy = useClipboard(output)

const handleClear = () => {
  timestampInput.value = ''
  dateInput.value = ''
  output.value = ''
}
</script>

<template>
  <ToolLayout
    :title="t('tools.timestamp.name')"
    output-copyable
    @copy="handleCopy"
  >
    <template #input>
      <div class="timestamp-form">
        <div class="form-group">
          <label>Timestamp</label>
          <input
            v-model="timestampInput"
            type="text"
            class="timestamp-input"
            placeholder="Enter timestamp..."
          >
        </div>
        <div class="form-group">
          <label>Date</label>
          <input
            v-model="dateInput"
            type="datetime-local"
            class="date-input"
          >
        </div>
        <div class="form-group">
          <label>Unit</label>
          <el-radio-group v-model="unit">
            <el-radio value="s">
              Seconds
            </el-radio>
            <el-radio value="ms">
              Milliseconds
            </el-radio>
          </el-radio-group>
        </div>
      </div>
    </template>

    <template #actions>
      <el-button
        type="primary"
        :icon="Clock"
        @click="handleConvert"
      >
        {{ t('common.convert') }}
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
.timestamp-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-color-secondary);
}

.timestamp-input,
.date-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  background-color: var(--bg-color);
  color: var(--text-color-primary);
}

.timestamp-input:focus,
.date-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
