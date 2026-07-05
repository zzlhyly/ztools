<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { copyToClipboard } from '@/utils/clipboard'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import ToolTextarea from '@/components/ToolTextarea.vue'
import { FileKey, Copy, Shield, Trash2 } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

const STORAGE_KEY = '/jwt'

const jwtInput = ref(appStore.getToolInput(STORAGE_KEY))
const publicKeyPem = ref('')
const showVerify = ref(false)

watch(jwtInput, (val) => {
  appStore.saveToolInput(STORAGE_KEY, val)
})

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  try {
    return decodeURIComponent(
      atob(str)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
  } catch {
    return atob(str)
  }
}

interface ParsedResult {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  rawParts: string[]
  headerEncoded: string
  payloadEncoded: string
}

interface ParseError {
  error: string
}

type ParseState = ParsedResult | ParseError | null

const parsed = computed<ParseState>(() => {
  const raw = jwtInput.value.trim()
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) return { error: 'Invalid JWT: expected 3 dot-separated parts' }

  try {
    const headerRaw = base64UrlDecode(parts[0])
    const payloadRaw = base64UrlDecode(parts[1])
    const header = JSON.parse(headerRaw)
    const payload = JSON.parse(payloadRaw)
    return {
      header,
      payload,
      signature: parts[2],
      rawParts: parts,
      headerEncoded: parts[0],
      payloadEncoded: parts[1],
    }
  } catch {
    return { error: 'Failed to decode JWT — invalid base64url encoding' }
  }
})

const expInfo = computed<{ expired: boolean; date: string } | null>(() => {
  if (!parsed.value || 'error' in parsed.value) return null
  const exp = parsed.value.payload.exp
  if (!exp || typeof exp !== 'number') return null
  const date = new Date(exp * 1000)
  return { expired: date.getTime() < Date.now(), date: date.toLocaleString() }
})

const verificationStatus = ref<'idle' | 'verified' | 'invalid'>('idle')

const handleVerify = async () => {
  if (!parsed.value || 'error' in parsed.value) return
  if (!publicKeyPem.value.trim()) return

  verificationStatus.value = 'idle'

  try {
    const pem = publicKeyPem.value.trim()
    const b64 = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '')
    const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

    const key = await crypto.subtle.importKey(
      'spki',
      der.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const sigStr = (parsed.value as ParsedResult).signature
    const sigRaw = sigStr.replace(/-/g, '+').replace(/_/g, '/')
    // proper padding
    const sigPadded = sigRaw.padEnd(Math.ceil(sigRaw.length / 4) * 4, '=')
    const sigBin = Uint8Array.from(atob(sigPadded), (c) => c.charCodeAt(0))

    const encoder = new TextEncoder()
    const data = encoder.encode(
      (parsed.value as ParsedResult).rawParts[0] + '.' + (parsed.value as ParsedResult).rawParts[1],
    )

    const isValid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      key,
      sigBin,
      data,
    )

    verificationStatus.value = isValid ? 'verified' : 'invalid'
    ElMessage.success(isValid ? 'Verified ✓' : 'Invalid ✗')
  } catch (e) {
    verificationStatus.value = 'invalid'
    ElMessage.error('Verification failed: ' + (e instanceof Error ? e.message : String(e)))
  }
}

const handleCopy = async (text: string) => {
  await copyToClipboard(text)
  ElMessage.success('Copied!')
}

const handleClear = () => {
  jwtInput.value = ''
  publicKeyPem.value = ''
  verificationStatus.value = 'idle'
  showVerify.value = false
}
</script>

<template>
  <ToolLayout :title="t('tools.jwt.name')">
    <template #input-actions>
      <el-button
        :type="showVerify ? 'primary' : 'default'"
        :icon="Shield"
        size="small"
        @click="showVerify = !showVerify"
      >
        Verify Signature
      </el-button>
    </template>

    <template #input>
      <div class="jwt-input-area">
        <ToolTextarea v-model="jwtInput" placeholder="Paste JWT token here..." />
        <Transition name="slide">
          <div v-if="showVerify" class="jwt-verify-section">
            <label class="verify-label">Public Key (PEM)</label>
            <el-input
              v-model="publicKeyPem"
              type="textarea"
              :rows="4"
              placeholder="-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"
            />
            <el-button
              type="success"
              size="small"
              :icon="Shield"
              :disabled="!publicKeyPem.trim()"
              @click="handleVerify"
            >
              Verify
            </el-button>
            <div
              v-if="parsed && !('error' in parsed) && verificationStatus !== 'idle'"
              class="verify-badge"
            >
              <el-tag
                :type="verificationStatus === 'verified' ? 'success' : 'danger'"
                effect="dark"
              >
                {{ verificationStatus === 'verified' ? 'Verified ✓' : 'Invalid ✗' }}
              </el-tag>
            </div>
          </div>
        </Transition>

        <div v-if="parsed && 'error' in parsed" class="jwt-error">
          {{ parsed.error }}
        </div>
      </div>
    </template>

    <template #output>
      <div v-if="parsed && !('error' in parsed)" class="jwt-output">
        <!-- Header -->
        <div class="jwt-section">
          <div class="jwt-section-header">
            <span class="jwt-section-title">Header</span>
            <el-button
              :icon="Copy"
              size="small"
              text
              @click="handleCopy(JSON.stringify(parsed.header, null, 2))"
            >
              Copy
            </el-button>
          </div>
          <pre class="jwt-code">{{ JSON.stringify(parsed.header, null, 2) }}</pre>
        </div>

        <!-- Payload -->
        <div class="jwt-section">
          <div class="jwt-section-header">
            <span class="jwt-section-title">Payload</span>
            <span class="jwt-badges">
              <el-tag
                v-if="expInfo"
                :type="expInfo.expired ? 'danger' : 'success'"
                size="small"
                effect="dark"
              >
                {{ expInfo.expired ? 'Expired: ' : 'Expires: ' }}{{ expInfo.date }}
              </el-tag>
            </span>
            <el-button
              :icon="Copy"
              size="small"
              text
              @click="handleCopy(JSON.stringify(parsed.payload, null, 2))"
            >
              Copy
            </el-button>
          </div>
          <pre class="jwt-code">{{ JSON.stringify(parsed.payload, null, 2) }}</pre>
        </div>

        <!-- Signature -->
        <div class="jwt-section">
          <div class="jwt-section-header">
            <span class="jwt-section-title">Signature</span>
            <span class="jwt-badges">
              <el-tag
                v-if="!showVerify || !publicKeyPem.trim()"
                type="info"
                size="small"
                effect="plain"
              >
                Not verified
              </el-tag>
              <el-tag
                v-else-if="verificationStatus === 'verified'"
                type="success"
                size="small"
                effect="dark"
              >
                Verified ✓
              </el-tag>
              <el-tag
                v-else-if="verificationStatus === 'invalid'"
                type="danger"
                size="small"
                effect="dark"
              >
                Invalid ✗
              </el-tag>
              <el-tag v-else type="info" size="small" effect="plain"> Not verified </el-tag>
            </span>
            <el-button :icon="Copy" size="small" text @click="handleCopy(parsed.signature)">
              Copy
            </el-button>
          </div>
          <pre class="jwt-code jwt-signature">{{ parsed.signature }}</pre>
        </div>
      </div>

      <div v-else-if="!parsed" class="jwt-empty">Paste a JWT token to decode</div>
    </template>

    <template #actions>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>
  </ToolLayout>
</template>

<style scoped>
.jwt-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  height: 100%;
}

.jwt-verify-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px);
  background: var(--bg-color-page, #f5f7fa);
  border-radius: var(--radius-md, 8px);
}

.verify-label {
  font-size: var(--font-size-sm, 13px);
  font-weight: 500;
  color: var(--text-color-regular, #606266);
}

.verify-badge {
  display: flex;
  align-items: center;
}

.jwt-error {
  color: var(--el-color-danger, #f56c6c);
  font-size: var(--font-size-sm, 13px);
  padding: var(--spacing-xs, 4px) 0;
}

.jwt-output {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 12px);
}

.jwt-section {
  border: 1px solid var(--border-color, #dcdfe6);
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
}

.jwt-section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  background: var(--bg-color-page, #f5f7fa);
  border-bottom: 1px solid var(--border-color, #dcdfe6);
}

.jwt-section-title {
  font-weight: 600;
  font-size: var(--font-size-sm, 13px);
  color: var(--text-color-primary, #303133);
}

.jwt-badges {
  flex: 1;
  display: flex;
  gap: var(--spacing-xs, 4px);
}

.jwt-code {
  margin: 0;
  padding: var(--spacing-md, 12px);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-sm, 13px);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-color-primary, #303133);
  overflow-x: auto;
}

.jwt-signature {
  font-size: 11px;
  word-break: break-all;
}

.jwt-empty {
  color: var(--text-color-placeholder, #c0c4cc);
  text-align: center;
  padding: var(--spacing-lg, 24px);
  font-size: var(--font-size-sm, 13px);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
