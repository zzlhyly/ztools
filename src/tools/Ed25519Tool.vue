<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { KeyRound, Trash2, FileSignature, ShieldCheck } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

// State
const isSupported = ref(true)
const publicKey = ref<CryptoKey | null>(null)
const privateKey = ref<CryptoKey | null>(null)
const showPem = ref(false)
const publicKeyJwk = ref('')
const privateKeyJwk = ref('')
const publicKeyPem = ref('')
const privateKeyPem = ref('')

const signData = ref('')
const signature = ref('')
const isSigning = ref(false)

const verifyData = ref('')
const verifySignature = ref('')
const verifyResult = ref<'valid' | 'invalid' | null>(null)
const isVerifying = ref(false)

// Check support on mount
onMounted(async () => {
  try {
    await crypto.subtle.generateKey({ name: 'Ed25519' } as any, true, ['sign', 'verify'])
    isSupported.value = true
  } catch {
    isSupported.value = false
  }

  // Restore sign/verify data only (keys are session-only)
  signData.value = appStore.getToolInput('/ed25519/signData')
  verifyData.value = appStore.getToolInput('/ed25519/verifyData')
})

// Helpers
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function formatBase64(raw: string): string {
  // Insert line breaks every 64 chars
  return raw.replace(/(.{64})/g, '$1\n')
}

// Key generation
const handleGenerateKeys = async () => {
  try {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' } as any, true, [
      'sign',
      'verify',
    ])

    publicKey.value = keyPair.publicKey
    privateKey.value = keyPair.privateKey

    // JWK export
    const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
    const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
    publicKeyJwk.value = JSON.stringify(pubJwk, null, 2)
    privateKeyJwk.value = JSON.stringify(privJwk, null, 2)

    // PEM export (for display when toggled)
    const spkiBuf = await crypto.subtle.exportKey('spki', keyPair.publicKey)
    const pkcs8Buf = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
    publicKeyPem.value = `-----BEGIN PUBLIC KEY-----\n${formatBase64(arrayBufferToBase64(spkiBuf))}\n-----END PUBLIC KEY-----`
    privateKeyPem.value = `-----BEGIN PRIVATE KEY-----\n${formatBase64(arrayBufferToBase64(pkcs8Buf))}\n-----END PRIVATE KEY-----`

    showPem.value = false
    ElMessage.success('Key pair generated')
  } catch (e) {
    ElMessage.error('Key generation failed: ' + (e instanceof Error ? e.message : String(e)))
  }
}

const displayPublicKey = computed(() => (showPem.value ? publicKeyPem.value : publicKeyJwk.value))
const displayPrivateKey = computed(() =>
  showPem.value ? privateKeyPem.value : privateKeyJwk.value,
)
const hasKeys = computed(() => !!publicKey.value)

// Sign
const handleSign = async () => {
  if (!privateKey.value || !signData.value) return
  isSigning.value = true
  try {
    const sigBuf = await crypto.subtle.sign(
      { name: 'Ed25519' },
      privateKey.value,
      new TextEncoder().encode(signData.value),
    )
    signature.value = arrayBufferToBase64(sigBuf)
    ElMessage.success('Signed successfully')
  } catch (e) {
    ElMessage.error('Signing failed: ' + (e instanceof Error ? e.message : String(e)))
  } finally {
    isSigning.value = false
  }
}

// Verify
const handleVerify = async () => {
  if (!publicKey.value || !verifyData.value || !verifySignature.value) return
  isVerifying.value = true
  try {
    const sigBuf = base64ToArrayBuffer(verifySignature.value)
    const valid = await crypto.subtle.verify(
      { name: 'Ed25519' },
      publicKey.value,
      sigBuf,
      new TextEncoder().encode(verifyData.value),
    )
    verifyResult.value = valid ? 'valid' : 'invalid'
  } catch {
    verifyResult.value = 'invalid'
  } finally {
    isVerifying.value = false
  }
}

// Persist data inputs
const persistSignData = () => appStore.saveToolInput('/ed25519/signData', signData.value)
const persistVerifyData = () => appStore.saveToolInput('/ed25519/verifyData', verifyData.value)

// Clear all
const handleClear = () => {
  publicKey.value = null
  privateKey.value = null
  publicKeyJwk.value = ''
  privateKeyJwk.value = ''
  publicKeyPem.value = ''
  privateKeyPem.value = ''
  showPem.value = false
  signature.value = ''
  verifyResult.value = null
  // Don't clear signData/verifyData to preserve user input
}
</script>

<template>
  <ToolLayout :title="t('tools.ed25519.name')">
    <template #input-actions>
      <el-button v-if="isSupported" :icon="KeyRound" type="primary" @click="handleGenerateKeys">
        {{ t('common.generate') }} Key Pair
      </el-button>
      <el-button v-if="hasKeys" :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>

    <template #input>
      <!-- Unsupported message -->
      <el-alert
        v-if="!isSupported"
        title="Ed25519 is not supported in this browser"
        type="warning"
        :closable="false"
        show-icon
      />

      <!-- Key display panel -->
      <div v-if="hasKeys" class="ed-key-section">
        <el-card shadow="never" class="ed-key-card">
          <template #header>
            <div class="ed-card-header">
              <span>Public Key</span>
              <el-switch v-model="showPem" active-text="PEM" inactive-text="JWK" size="small" />
            </div>
          </template>
          <pre class="ed-key-pre">{{ displayPublicKey }}</pre>
        </el-card>
        <el-card shadow="never" class="ed-key-card">
          <template #header>
            <div class="ed-card-header">
              <span>Private Key</span>
            </div>
          </template>
          <pre class="ed-key-pre">{{ displayPrivateKey }}</pre>
        </el-card>
      </div>

      <!-- Sign panel -->
      <el-card v-if="hasKeys" shadow="never" class="ed-panel">
        <template #header>
          <div class="ed-card-header">
            <FileSignature :size="16" />
            <span>Sign Data</span>
          </div>
        </template>
        <textarea
          v-model="signData"
          class="ed-textarea"
          placeholder="Enter data to sign..."
          @input="persistSignData"
        />
        <div class="ed-panel-actions">
          <el-button
            :icon="FileSignature"
            type="primary"
            :loading="isSigning"
            :disabled="!signData"
            @click="handleSign"
          >
            {{ t('common.encrypt') }}
          </el-button>
        </div>
        <div v-if="signature" class="ed-result">
          <label class="ed-result-label">Signature (Base64):</label>
          <pre class="ed-key-pre">{{ signature }}</pre>
        </div>
      </el-card>

      <!-- Verify panel -->
      <el-card v-if="hasKeys" shadow="never" class="ed-panel">
        <template #header>
          <div class="ed-card-header">
            <ShieldCheck :size="16" />
            <span>Verify Signature</span>
          </div>
        </template>
        <textarea
          v-model="verifyData"
          class="ed-textarea"
          placeholder="Enter original data..."
          @input="persistVerifyData"
        />
        <el-input
          v-model="verifySignature"
          placeholder="Signature (Base64)"
          class="ed-signature-input"
        />
        <div class="ed-panel-actions">
          <el-button
            :icon="ShieldCheck"
            type="primary"
            :loading="isVerifying"
            :disabled="!verifyData || !verifySignature"
            @click="handleVerify"
          >
            {{ t('common.test') }}
          </el-button>
        </div>
        <div v-if="verifyResult" class="ed-result">
          <span v-if="verifyResult === 'valid'" class="ed-valid"> ✓ Signature Valid </span>
          <span v-else class="ed-invalid"> ✗ Signature Invalid </span>
        </div>
      </el-card>
    </template>
  </ToolLayout>
</template>

<style scoped>
.ed-key-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.ed-card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.ed-key-card {
  margin-bottom: 0;
}

.ed-key-pre {
  margin: 0;
  padding: var(--spacing-sm);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  background-color: var(--bg-color-page);
  border-radius: var(--radius-md);
  max-height: 200px;
  overflow: auto;
}

.ed-panel {
  margin-bottom: var(--spacing-md);
}

.ed-textarea {
  width: 100%;
  min-height: 100px;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
  resize: vertical;
  background-color: var(--bg-color);
  color: var(--text-color-primary);
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.ed-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.ed-textarea::placeholder {
  color: var(--text-color-placeholder);
}

.ed-panel-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.ed-signature-input {
  margin-top: var(--spacing-sm);
}

.ed-result {
  margin-top: var(--spacing-sm);
}

.ed-result-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-caption);
  display: block;
  margin-bottom: var(--spacing-xs);
}

.ed-valid {
  color: #67c23a;
  font-weight: 600;
  font-size: var(--font-size-md);
}

.ed-invalid {
  color: #f56c6c;
  font-weight: 600;
  font-size: var(--font-size-md);
}
</style>
