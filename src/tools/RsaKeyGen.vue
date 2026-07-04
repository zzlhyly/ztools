<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { generateRsaKeyPair, arrayBufferToHex, base64ToArrayBuffer, CryptoError } from '@/utils/crypto'
import { useClipboard } from '@/composables/useClipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { KeyRound } from 'lucide-vue-next'

const { t } = useI18n()

const keySize = ref<1024 | 2048 | 4096>(2048)
const format = ref<'PEM' | 'DER'>('PEM')
const publicKey = ref('')
const privateKey = ref('')
const isGenerating = ref(false)

const KEY_SIZES = [1024, 2048, 4096] as const
const FORMATS = ['PEM', 'DER'] as const

function pemToDer(pem: string): ArrayBuffer {
  const lines = pem.trim().split('\n').filter(line => !line.startsWith('-----'))
  return base64ToArrayBuffer(lines.join(''))
}

function formatOutput(pem: string): string {
  if (format.value === 'DER') {
    return arrayBufferToHex(pemToDer(pem))
  }
  return pem
}

async function handleGenerate() {
  if (isGenerating.value) return
  try {
    isGenerating.value = true
    const pair = await generateRsaKeyPair(keySize.value)
    publicKey.value = formatOutput(pair.publicKey)
    privateKey.value = formatOutput(pair.privateKey)
    ElMessage.success('Key pair generated')
  } catch (e) {
    ElMessage.error(e instanceof CryptoError ? e.message : 'Generation failed')
  } finally {
    isGenerating.value = false
  }
}

const copyPublic = useClipboard(publicKey)

const copyPrivate = useClipboard(privateKey)
</script>

<template>
  <ToolLayout title="RSA Key Generator" :output-copyable="false">
    <template #input-actions>
      <el-select v-model="keySize" size="small" style="width: 120px">
        <el-option v-for="ks in KEY_SIZES" :key="ks" :label="`${ks} bit`" :value="ks" />
      </el-select>
      <el-select v-model="format" size="small" style="width: 110px">
        <el-option v-for="f in FORMATS" :key="f" :label="f" :value="f" />
      </el-select>
    </template>

    <template #input>
      <div class="rsa-input-area" />
    </template>

    <template #actions>
      <el-button type="primary" :icon="KeyRound" :loading="isGenerating" @click="handleGenerate">
        {{ t('common.generate') }}
      </el-button>
    </template>

    <template #output>
      <div class="key-panels">
        <div class="key-panel public-key-panel">
          <div class="key-panel-header">
            <span class="key-panel-title">{{ t('common.publicKey') }}</span>
            <el-button size="small" @click="copyPublic">{{ t('common.copy') }}</el-button>
          </div>
          <div class="key-panel-body">
            <CodeOutput :content="publicKey" />
          </div>
        </div>
        <div class="key-panel private-key-panel">
          <div class="key-panel-header">
            <span class="key-panel-title">{{ t('common.privateKey') }}</span>
            <el-button size="small" @click="copyPrivate">{{ t('common.copy') }}</el-button>
          </div>
          <div class="key-panel-body">
            <CodeOutput :content="privateKey" />
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.key-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  height: 100%;
}

.key-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.key-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-color-page);
  border-bottom: 1px solid var(--border-color);
}

.key-panel-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.key-panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  overflow: auto;
  min-height: 0;
}

.private-key-panel {
  background-color: var(--el-color-warning-light-9, #fdf6ec);
  border-color: var(--el-color-warning-light-7, #faecd8);
}

.rsa-input-area {
  height: 100%;
}
</style>
