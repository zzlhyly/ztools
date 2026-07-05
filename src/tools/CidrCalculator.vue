<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { Trash2 } from 'lucide-vue-next'
import { calculateCidr } from '@/utils/cidr'

const { t } = useI18n()
const appStore = useAppStore()

const STORAGE_KEY = '/cidr'

const input = ref(appStore.getToolInput(STORAGE_KEY))

watch(input, (val) => {
  appStore.saveToolInput(STORAGE_KEY, val)
})

const error = ref('')

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

  const result = calculateCidr(parts[0], parseInt(parts[1], 10))
  if (!result) {
    error.value = 'Invalid IP address or prefix length (must be 0-32)'
    rows.value = []
    return
  }

  rows.value = [
    { label: 'Network Address', value: result.network },
    { label: 'Broadcast Address', value: result.broadcast },
    { label: 'Host Range', value: result.hostRange },
    { label: 'Total Hosts', value: result.totalHosts.toLocaleString() },
    { label: 'Subnet Mask', value: result.subnetMask },
    { label: 'Wildcard Mask', value: result.wildcardMask },
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
