<script setup lang="ts">
import { Copy } from 'lucide-vue-next'

interface Props {
  title: string
  copyable?: boolean
}

withDefaults(defineProps<Props>(), {
  copyable: false,
})

const emit = defineEmits<{
  copy: []
}>()
</script>

<template>
  <div class="tool-panel">
    <div class="panel-header">
      <span class="panel-title">{{ title }}</span>
      <div class="panel-actions">
        <slot name="actions" />
        <el-button
          v-if="copyable"
          type="info"
          link
          :icon="Copy"
          @click="emit('copy')"
        >
          {{ $t('common.copy') }}
        </el-button>
      </div>
    </div>
    <div class="panel-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tool-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--surface-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-color);
  overflow: hidden;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-color-page);
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  overflow: auto;
  min-height: 0;
}
</style>
