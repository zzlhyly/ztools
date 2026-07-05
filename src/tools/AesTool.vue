<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  aesEncrypt,
  aesDecrypt,
  generateAesKey,
  generateAesIv,
  CryptoError,
  arrayBufferToHex,
  base64ToArrayBuffer,
  hexToArrayBuffer,
  arrayBufferToBase64,
} from '@/utils/crypto'
import { useClipboard } from '@/composables/useClipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Lock, Unlock, Trash2, RefreshCw } from 'lucide-vue-next'

const { t } = useI18n()

const input = ref('')
const output = ref('')
const mode = ref('CBC')
const keySize = ref<128 | 192 | 256>(128)
const padding = ref('PKCS7')
const outputFormat = ref('Base64')
const keyHex = ref('')
const ivHex = ref('')
const isProcessing = ref(false)
const lastSucceeded = ref(false)
const lastOperation = ref<'encrypt' | 'decrypt' | null>(null)

const MODES = ['CBC', 'CTR', 'GCM'] as const
const KEY_SIZES = [128, 192, 256] as const
const PADDINGS = ['PKCS7', 'NoPadding', 'ZeroPadding'] as const
const OUTPUT_FORMATS = ['Base64', 'HEX'] as const
const MODES_WITHOUT_PADDING = ['CTR', 'GCM']

const showPadding = computed(() => !MODES_WITHOUT_PADDING.includes(mode.value))

const noPaddingWarning = computed(() => {
  if (padding.value !== 'NoPadding' || !input.value) return ''
  const raw = new TextEncoder().encode(input.value)
  if (raw.length % 16 === 0) return ''
  return `Byte alignment warning: ${raw.length} bytes is not a multiple of 16. Result may be incorrect.`
})

const showWarning = computed(() => !!noPaddingWarning.value)

function convertOutputForDisplay(data: string): string {
  if (outputFormat.value === 'HEX') {
    return arrayBufferToHex(base64ToArrayBuffer(data))
  }
  return data
}

function convertInputForDecrypt(data: string): string {
  if (outputFormat.value === 'HEX') {
    return arrayBufferToBase64(hexToArrayBuffer(data))
  }
  return data
}

async function handleEncrypt() {
  if (isProcessing.value || !input.value.trim()) return
  if (!keyHex.value.trim() || !ivHex.value.trim()) {
    ElMessage.warning(t('errors.invalidInput'))
    return
  }
  try {
    isProcessing.value = true
    const result = await aesEncrypt(
      input.value,
      keyHex.value,
      ivHex.value,
      mode.value,
      keySize.value,
      padding.value,
    )
    output.value = convertOutputForDisplay(result)
    lastSucceeded.value = true
    lastOperation.value = 'encrypt'
    ElMessage.success(t('common.success'))
  } catch (e) {
    lastSucceeded.value = false
    lastOperation.value = null
    ElMessage.error(e instanceof CryptoError ? e.message : t('errors.invalidInput'))
  } finally {
    isProcessing.value = false
  }
}

async function handleDecrypt() {
  if (isProcessing.value || !input.value.trim()) return
  if (!keyHex.value.trim() || !ivHex.value.trim()) {
    ElMessage.warning(t('errors.invalidInput'))
    return
  }
  try {
    isProcessing.value = true
    const normalized = convertInputForDecrypt(input.value)
    const result = await aesDecrypt(
      normalized,
      keyHex.value,
      ivHex.value,
      mode.value,
      keySize.value,
      padding.value,
    )
    output.value = result
    lastSucceeded.value = true
    lastOperation.value = 'decrypt'
    ElMessage.success(t('common.success'))
  } catch (e) {
    lastSucceeded.value = false
    lastOperation.value = null
    ElMessage.error(e instanceof CryptoError ? e.message : t('errors.invalidInput'))
  } finally {
    isProcessing.value = false
  }
}

async function handleGenerateKey() {
  keyHex.value = await generateAesKey(keySize.value)
}

function handleGenerateIv() {
  ivHex.value = generateAesIv()
}

const handleCopy = useClipboard(output)

const handleClear = () => {
  input.value = ''
  output.value = ''
  keyHex.value = ''
  ivHex.value = ''
  lastSucceeded.value = false
  lastOperation.value = null
}

watch([mode, keySize, padding, outputFormat, keyHex, ivHex], () => {
  if (!lastSucceeded.value || !input.value.trim() || !keyHex.value.trim() || !ivHex.value.trim())
    return
  if (lastOperation.value === 'encrypt') handleEncrypt()
  else if (lastOperation.value === 'decrypt') handleDecrypt()
})
</script>

<template>
  <ToolLayout :title="t('tools.aes.name')" output-copyable @copy="handleCopy">
    <template #input-actions>
      <el-select v-model="mode" size="small" style="width: 100px">
        <el-option v-for="m in MODES" :key="m" :label="m" :value="m" />
      </el-select>
      <el-select v-model="keySize" size="small" style="width: 110px">
        <el-option v-for="ks in KEY_SIZES" :key="ks" :label="`${ks} bit`" :value="ks" />
      </el-select>
      <el-select v-if="showPadding" v-model="padding" size="small" style="width: 120px">
        <el-option v-for="p in PADDINGS" :key="p" :label="p" :value="p" />
      </el-select>
      <el-select v-model="outputFormat" size="small" style="width: 110px">
        <el-option v-for="f in OUTPUT_FORMATS" :key="f" :label="f" :value="f" />
      </el-select>
    </template>

    <template #input>
      <div class="aes-input-area">
        <ToolTextarea
          v-model="input"
          :placeholder="t('common.placeholder')"
          submit-hotkey
          @submit="handleEncrypt"
        />
        <div class="key-iv-row">
          <div class="key-iv-field">
            <span class="key-iv-label">{{ t('common.key') }}:</span>
            <el-input
              v-model="keyHex"
              :placeholder="t('common.keyHex')"
              size="small"
              class="key-iv-input"
            />
            <el-button :icon="RefreshCw" size="small" @click="handleGenerateKey">
              {{ t('common.random') }}
            </el-button>
          </div>
        </div>
        <div class="key-iv-row">
          <div class="key-iv-field">
            <span class="key-iv-label">{{ t('common.iv') }}:</span>
            <el-input
              v-model="ivHex"
              :placeholder="t('common.ivHex')"
              size="small"
              class="key-iv-input"
            />
            <el-button :icon="RefreshCw" size="small" @click="handleGenerateIv">
              {{ t('common.random') }}
            </el-button>
          </div>
        </div>
        <div v-if="showWarning" class="no-padding-warning">
          {{ noPaddingWarning }}
        </div>
      </div>
    </template>

    <template #actions>
      <el-button type="primary" :icon="Lock" :loading="isProcessing" @click="handleEncrypt">
        {{ t('common.encrypt') }}
      </el-button>
      <el-button :icon="Unlock" :loading="isProcessing" @click="handleDecrypt">
        {{ t('common.decrypt') }}
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
.aes-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  height: 100%;
}

.key-iv-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.key-iv-field {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  flex: 1;
}

.key-iv-label {
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  color: var(--text-color-regular, #606266);
  white-space: nowrap;
  min-width: 28px;
}

.key-iv-input {
  flex: 1;
}

:deep(.key-iv-input .el-input__wrapper) {
  font-family: var(--font-family-mono, 'Cascadia Code', 'Fira Code', monospace);
  font-size: var(--font-size-sm, 12px);
}

.no-padding-warning {
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  background: var(--el-color-warning-light-9, #fdf6ec);
  border: 1px solid var(--el-color-warning-light-7, #faecd8);
  border-radius: var(--radius-md, 6px);
  font-size: var(--font-size-xs, 12px);
  color: var(--el-color-warning, #e6a23c);
}
</style>
