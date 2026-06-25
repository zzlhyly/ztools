<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Palette, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()

const hexInput = ref('')
const rInput = ref('')
const gInput = ref('')
const bInput = ref('')
const output = ref('')

const previewColor = computed(() => {
  if (hexInput.value && /^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
    return hexInput.value
  }
  if (rInput.value && gInput.value && bInput.value) {
    const r = parseInt(rInput.value)
    const g = parseInt(gInput.value)
    const b = parseInt(bInput.value)
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  return ''
})

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    throw new Error('Invalid HEX')
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

const handleConvert = () => {
  try {
    if (hexInput.value && hexInput.value.trim()) {
      const { r, g, b } = hexToRgb(hexInput.value)
      output.value = `RGB: ${r}, ${g}, ${b}\nHEX: ${hexInput.value}`
    } else if (rInput.value !== '' && gInput.value !== '' && bInput.value !== '') {
      const r = parseInt(rInput.value)
      const g = parseInt(gInput.value)
      const b = parseInt(bInput.value)
      if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        throw new Error('Invalid RGB')
      }
      const hex = rgbToHex(r, g, b)
      output.value = `HEX: ${hex}\nRGB: ${r}, ${g}, ${b}`
    }
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
  hexInput.value = ''
  rInput.value = ''
  gInput.value = ''
  bInput.value = ''
  output.value = ''
}
</script>

<template>
  <ToolLayout :title="t('tools.color.name')" output-copyable @copy="handleCopy">
    <template #input>
      <div class="color-form">
        <div class="form-group">
          <label>HEX</label>
          <el-input v-model="hexInput" placeholder="#ff0000" />
        </div>
        <div class="form-group">
          <label>RGB</label>
          <div class="rgb-inputs">
            <el-input v-model="rInput" placeholder="R" />
            <el-input v-model="gInput" placeholder="G" />
            <el-input v-model="bInput" placeholder="B" />
          </div>
        </div>
        <div v-if="previewColor" class="form-group">
          <label>Preview</label>
          <div class="color-preview" :style="{ backgroundColor: previewColor }" />
        </div>
      </div>
    </template>

    <template #actions>
      <el-button type="primary" :icon="Palette" @click="handleConvert">
        {{ t('common.convert') }}
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
.color-form {
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

.rgb-inputs {
  display: flex;
  gap: var(--spacing-sm);
}

.color-preview {
  width: 100%;
  height: 50px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
