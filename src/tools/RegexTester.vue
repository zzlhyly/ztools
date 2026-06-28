<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import ToolLayout from '@/components/ToolLayout.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Search, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const regexPattern = ref('')
const testString = ref('')
const output = ref('')
const flags = ref<string[]>([])

const handleTest = () => {
  try {
    if (!regexPattern.value) {
      output.value = 'No matches'
      return
    }
    const regex = new RegExp(regexPattern.value, flags.value.join(''))
    const matches = testString.value.match(regex)
    if (matches && matches.length > 0) {
      output.value = matches.join('\n')
    } else {
      output.value = 'No matches'
    }
    ElMessage.success(t('common.success'))
  } catch {
    ElMessage.error(t('errors.invalidInput'))
  }
}

const handleClear = () => {
  regexPattern.value = ''
  testString.value = ''
  output.value = ''
  flags.value = []
}
</script>

<template>
  <ToolLayout :title="t('tools.regex.name')">
    <template #input>
      <div class="regex-form">
        <div class="form-group">
          <label>Pattern</label>
          <input
            v-model="regexPattern"
            type="text"
            class="regex-input"
            placeholder="Enter regex pattern..."
          />
        </div>
        <div class="form-group">
          <label>Test String</label>
          <textarea
            v-model="testString"
            class="test-input"
            placeholder="Enter test string..."
          />
        </div>
        <div class="form-group">
          <label>Flags</label>
          <el-checkbox-group v-model="flags">
            <el-checkbox value="g" label="g (global)" />
            <el-checkbox value="i" label="i (case insensitive)" />
            <el-checkbox value="m" label="m (multiline)" />
          </el-checkbox-group>
        </div>
      </div>
    </template>

    <template #actions>
      <el-button type="primary" :icon="Search" @click="handleTest">
        {{ t('common.test') }}
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
.regex-form {
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

.regex-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  background-color: var(--bg-color);
  color: var(--text-color-primary);
}

.regex-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.test-input {
  width: 100%;
  min-height: 150px;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.5;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color-primary);
}

.test-input:focus {
  outline: none;
  border-color: var(--color-primary);
}
</style>
