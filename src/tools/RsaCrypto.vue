<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  rsaEncrypt,
  rsaDecrypt,
  rsaSign,
  rsaVerify,
  getRsaMaxPayload,
  CryptoError,
  arrayBufferToHex,
  base64ToArrayBuffer,
} from '@/utils/crypto'
import { copyToClipboard } from '@/utils/clipboard'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import CodeOutput from '@/components/CodeOutput.vue'
import { Lock, Unlock, Trash2, FileSignature, Fingerprint } from 'lucide-vue-next'

const input = ref('')
const publicKey = ref('')
const privateKey = ref('')
const encryptPadding = ref('OAEP-SHA-256')
const signPadding = ref('PSS-SHA-256')
const outputFormat = ref('Base64')
const output = ref('')
const isProcessing = ref(false)
const lastSignature = ref('')
const keySize = ref(2048)

const ENCRYPT_PADDINGS = ['PKCS#1 v1.5', 'OAEP-SHA-1', 'OAEP-SHA-256', 'OAEP-SHA-512'] as const
const SIGN_PADDINGS = ['PKCS#1 v1.5', 'PSS-SHA-256', 'PSS-SHA-512'] as const
const OUTPUT_FORMATS = ['Base64', 'HEX'] as const

function estimateKeySizeFromPem(pem: string): number {
  if (!pem || !pem.includes('PUBLIC KEY')) return 2048
  try {
    const b64 = pem.replace(/-----.*?-----/g, '').replace(/\s/g, '')
    const der = atob(b64)
    // ponytail: rough overhead (ASN.1 structure ~36 bytes), exact parsing if needed
    const keyBytes = Math.max(0, der.length - 36)
    if (keyBytes > 384) return 4096
    if (keyBytes > 192) return 2048
    return 1024
  } catch {
    return 2048
  }
}

const maxPayload = computed(() => {
  if (!publicKey.value || !publicKey.value.includes('PUBLIC KEY')) return null
  return getRsaMaxPayload(keySize.value, encryptPadding.value)
})

const maxPayloadHint = computed(() => {
  if (maxPayload.value === null) return ''
  return `Max payload: \u2264${maxPayload.value} bytes`
})

const encryptDisabled = computed(() => {
  if (!input.value || !publicKey.value || maxPayload.value === null) return true
  return new TextEncoder().encode(input.value).length > maxPayload.value
})

function convertToHex(b64: string): string {
  return arrayBufferToHex(base64ToArrayBuffer(b64))
}

async function handleEncrypt() {
  if (isProcessing.value) return
  try {
    isProcessing.value = true
    const result = await rsaEncrypt(input.value, publicKey.value, encryptPadding.value)
    output.value = outputFormat.value === 'HEX' ? convertToHex(result) : result
    ElMessage.success('Encrypted')
  } catch (e) {
    ElMessage.error(e instanceof CryptoError ? e.message : 'Encryption failed')
  } finally {
    isProcessing.value = false
  }
}

async function handleDecrypt() {
  if (isProcessing.value || !input.value.trim() || !privateKey.value.trim()) return
  try {
    isProcessing.value = true
    const normalized = outputFormat.value === 'HEX' ? input.value : input.value
    const result = await rsaDecrypt(normalized, privateKey.value, encryptPadding.value)
    output.value = result
    ElMessage.success('Decrypted')
  } catch (e) {
    ElMessage.error(e instanceof CryptoError ? e.message : 'Decryption failed')
  } finally {
    isProcessing.value = false
  }
}

async function handleSign() {
  if (isProcessing.value || !input.value.trim() || !privateKey.value.trim()) return
  try {
    isProcessing.value = true
    const result = await rsaSign(input.value, privateKey.value, signPadding.value)
    lastSignature.value = result
    output.value = outputFormat.value === 'HEX' ? convertToHex(result) : result
    ElMessage.success('Signed')
  } catch (e) {
    ElMessage.error(e instanceof CryptoError ? e.message : 'Signing failed')
  } finally {
    isProcessing.value = false
  }
}

async function handleVerify() {
  if (isProcessing.value) return
  if (!lastSignature.value) {
    ElMessage.warning('Sign some data first to generate a signature')
    return
  }
  try {
    isProcessing.value = true
    const valid = await rsaVerify(lastSignature.value, input.value, publicKey.value, signPadding.value)
    output.value = valid ? '\u2713 Signature valid' : '\u2717 Signature invalid'
    ElMessage.success(valid ? 'Signature is valid' : 'Signature is invalid')
  } catch (e) {
    output.value = '\u2717 Verification failed'
    ElMessage.error(e instanceof CryptoError ? e.message : 'Verification failed')
  } finally {
    isProcessing.value = false
  }
}

const handleCopy = async () => {
  if (output.value) {
    await copyToClipboard(output.value)
    ElMessage.success('Copied to clipboard')
  }
}

const handleClear = () => {
  input.value = ''
  publicKey.value = ''
  privateKey.value = ''
  output.value = ''
  lastSignature.value = ''
}

watch([publicKey, encryptPadding], () => {
  keySize.value = estimateKeySizeFromPem(publicKey.value)
})
</script>

<template>
  <ToolLayout title="RSA Encrypt/Decrypt/Sign/Verify" output-copyable @copy="handleCopy">
    <template #input-actions>
      <el-select v-model="encryptPadding" size="small" style="width: 160px">
        <el-option v-for="p in ENCRYPT_PADDINGS" :key="p" :label="p" :value="p" />
      </el-select>
      <el-select v-model="signPadding" size="small" style="width: 150px">
        <el-option v-for="p in SIGN_PADDINGS" :key="p" :label="p" :value="p" />
      </el-select>
      <el-select v-model="outputFormat" size="small" style="width: 110px">
        <el-option v-for="f in OUTPUT_FORMATS" :key="f" :label="f" :value="f" />
      </el-select>
    </template>

    <template #input>
      <div class="rsa-input-area">
        <ToolTextarea
          v-model="input"
          placeholder="Enter data..."
          submit-hotkey
          @submit="handleEncrypt"
        />
        <div v-if="maxPayloadHint" class="payload-hint">
          {{ maxPayloadHint }}
        </div>
        <el-input
          v-model="publicKey"
          type="textarea"
          :rows="4"
          placeholder="Public Key (PEM)"
          class="key-input"
        />
        <el-input
          v-model="privateKey"
          type="textarea"
          :rows="4"
          placeholder="Private Key (PEM)"
          class="key-input"
        />
      </div>
    </template>

    <template #actions>
      <el-button type="primary" :icon="Lock" :disabled="encryptDisabled" :loading="isProcessing" @click="handleEncrypt">
        Public Encrypt
      </el-button>
      <el-button :icon="Unlock" :disabled="!privateKey.trim() || !input.trim()" :loading="isProcessing" @click="handleDecrypt">
        Private Decrypt
      </el-button>
      <el-button :icon="FileSignature" :disabled="!privateKey.trim() || !input.trim()" :loading="isProcessing" @click="handleSign">
        Private Sign
      </el-button>
      <el-button :icon="Fingerprint" :disabled="!publicKey.trim() || !input.trim()" :loading="isProcessing" @click="handleVerify">
        Public Verify
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        Clear
      </el-button>
    </template>

    <template #output>
      <CodeOutput :content="output" language="text" />
    </template>
  </ToolLayout>
</template>

<style scoped>
.rsa-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  height: 100%;
}

.payload-hint {
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  font-size: var(--font-size-xs, 12px);
  color: var(--text-caption, #909399);
  background: var(--bg-color-page, #f5f7fa);
  border-radius: var(--radius-md, 6px);
}

.key-input :deep(.el-textarea__inner) {
  font-family: var(--font-family-mono, 'Cascadia Code', 'Fira Code', monospace);
  font-size: var(--font-size-sm, 12px);
}
</style>
