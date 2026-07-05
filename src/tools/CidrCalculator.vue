<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { Trash2 } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

const STORAGE_KEY = '/cidr'

const input = ref(appStore.getToolInput(STORAGE_KEY))

watch(input, (val) => {
  appStore.saveToolInput(STORAGE_KEY, val)
})

const error = ref('')

function ipToUint32(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let result = 0
  for (const part of parts) {
    const oct = parseInt(part, 10)
    if (isNaN(oct) || oct < 0 || oct > 255) return null
    result = (result << 8) + oct
  }
  return result >>> 0
}

function formatIp(v: number): string {
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].join('.')
}

const rows = ref<CidrRow[]>([])

type CidrRow = { label: string; value: string }

function compute() {
  error.value = ''
  const raw = input.value.trim()
  if (!raw) {
    rows.value = []
    return
  }

  const parts = raw.split('/')
  if (parts.length !== 2) {
    error.value = 'Invalid CIDR notation (e.g. 192.168.1.0/24)'
    rows.value = []
    return
  }

  const ip = ipToUint32(parts[0])
  const prefix = parseInt(parts[1], 10)

  if (ip === null || isNaN(prefix) || prefix < 0 || prefix > 32) {
    error.value = 'Invalid IP address or prefix length (must be 0-32)'
    rows.value = []
    return
  }

  const mask = ~((1 << (32 - prefix)) - 1) >>> 0
  const network = ip & mask
  const broadcast = prefix === 32 ? ip : (network | (~mask >>> 0)) >>> 0
  const total = prefix === 32 ? 1 : prefix === 31 ? 2 : (1 << (32 - prefix)) - 2
  const firstHost = prefix >= 31 ? network : network + 1
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1

  rows.value = [
    { label: 'Network Address', value: formatIp(network) },
    { label: 'Broadcast Address', value: formatIp(broadcast) },
    { label: 'Host Range', value: `${formatIp(firstHost)} — ${formatIp(lastHost)}` },
    { label: 'Total Hosts', value: total.toLocaleString() },
    { label: 'Subnet Mask', value: formatIp(mask) },
    { label: 'Wildcard Mask', value: formatIp(~mask >>> 0) },
  ]
}

watch(input, compute, { immediate: true })

const handleClear = () => {
  input.value = ''
}
</script>

<template>
  <ToolLayout :title="t('tools.cidr.name')">
    <template #input>
      <div class="cidr-input-area">
        <el-input v-model="input" placeholder="192.168.1.0/24" clearable @input="error = ''" />
        <div v-if="error" class="cidr-error">
          {{ error }}
        </div>
      </div>
    </template>

    <template #output>
      <div v-if="rows.length > 0" class="cidr-table">
        <div v-for="row in rows" :key="row.label" class="cidr-row">
          <span class="cidr-label">{{ row.label }}</span>
          <span class="cidr-value">{{ row.value }}</span>
        </div>
      </div>
      <div v-else class="cidr-empty">Enter a CIDR notation to see results</div>
    </template>

    <template #actions>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
    </template>
  </ToolLayout>
</template>

<style scoped>
.cidr-input-area {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.cidr-error {
  color: var(--el-color-danger, #f56c6c);
  font-size: var(--font-size-sm, 13px);
}

.cidr-table {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
}

.cidr-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  background: var(--bg-color-page, #f5f7fa);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm, 13px);
}

.cidr-label {
  font-weight: 600;
  color: var(--text-color-regular, #606266);
}

.cidr-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: var(--text-color-primary, #303133);
}

.cidr-empty {
  color: var(--text-color-placeholder, #c0c4cc);
  text-align: center;
  padding: var(--spacing-lg, 24px);
  font-size: var(--font-size-sm, 13px);
}
</style>
