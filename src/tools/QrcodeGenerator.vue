<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'
import { Download } from 'lucide-vue-next'
import ToolLayout from '@/components/ToolLayout.vue'

const { t } = useI18n()
const route = useRoute()
const appStore = useAppStore()

const SETTINGS_KEY = route.path + '/settings'

const text = ref('')
const size = ref(256)
const fgColor = ref('#000000')
const bgColor = ref('#FFFFFF')
const svg = ref('')

let generateTimer: ReturnType<typeof setTimeout> | null = null

async function generateCode() {
  if (!text.value.trim()) {
    svg.value = ''
    return
  }
  try {
    svg.value = await QRCode.toString(text.value, {
      type: 'svg',
      width: size.value,
      color: {
        dark: fgColor.value,
        light: bgColor.value,
      },
      errorCorrectionLevel: 'M',
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    ElMessage.error(message)
  }
}

function scheduleGenerate() {
  if (generateTimer) clearTimeout(generateTimer)
  generateTimer = setTimeout(generateCode, 300)
}

function downloadSvg() {
  if (!svg.value) return
  const blob = new Blob([svg.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'qrcode.svg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadPng() {
  if (!svg.value) return
  const blob = new Blob([svg.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    URL.revokeObjectURL(url)
    const canvas = document.createElement('canvas')
    canvas.width = size.value
    canvas.height = size.value
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = bgColor.value
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return
      const pngUrl = URL.createObjectURL(pngBlob)
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = 'qrcode.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(pngUrl), 100)
    })
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    ElMessage.error(t('errors.unknown'))
  }
  img.src = url
}

// Tool input memory
onMounted(() => {
  text.value = appStore.getToolInput(route.path)
  try {
    const saved = JSON.parse(appStore.getToolInput(SETTINGS_KEY))
    if (saved.size) size.value = saved.size
    if (saved.fgColor) fgColor.value = saved.fgColor
    if (saved.bgColor) bgColor.value = saved.bgColor
  } catch {
    // use defaults
  }
})

watch(text, (val) => {
  appStore.saveToolInput(route.path, val)
  scheduleGenerate()
})

watch([size, fgColor, bgColor], () => {
  appStore.saveToolInput(
    SETTINGS_KEY,
    JSON.stringify({ size: size.value, fgColor: fgColor.value, bgColor: bgColor.value }),
  )
  scheduleGenerate()
})
</script>

<template>
  <ToolLayout :title="t('tools.qrcode.name')">
    <template #input-actions>
      <div class="qrcode-controls">
        <div class="control-row">
          <label>{{ $t('common.size') }}</label>
          <el-slider v-model="size" :min="128" :max="1024" :step="1" style="width: 180px" />
          <span class="size-value">{{ size }}×{{ size }}</span>
        </div>
        <div class="control-row">
          <label>{{ $t('common.fgColor') }}</label>
          <el-color-picker v-model="fgColor" />
        </div>
        <div class="control-row">
          <label>{{ $t('common.bgColor') }}</label>
          <el-color-picker v-model="bgColor" />
        </div>
      </div>
    </template>

    <template #input>
      <el-input v-model="text" :placeholder="t('common.placeholder')" clearable />
    </template>

    <template #actions>
      <el-button :icon="Download" @click="downloadSvg"> SVG </el-button>
      <el-button :icon="Download" @click="downloadPng"> PNG </el-button>
    </template>

    <template #output>
      <div v-if="svg" class="qrcode-preview">
        <div v-html="svg" />
      </div>
      <div v-else class="empty-state">
        {{ $t('common.output') }}
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.qrcode-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
  align-items: center;
}

.control-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.control-row label {
  font-size: var(--font-size-sm);
  color: var(--text-color-secondary);
  white-space: nowrap;
}

.size-value {
  font-size: var(--font-size-xs);
  color: var(--text-color-placeholder);
  min-width: 5em;
}

.qrcode-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--spacing-lg);
}

.qrcode-preview :deep(svg) {
  max-width: 100%;
  height: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-color-placeholder);
  font-size: var(--font-size-sm);
}
</style>
