<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  title: string
  inputLabel?: string
  outputLabel?: string
}>(), {
  inputLabel: '',
  outputLabel: '',
})

const { t } = useI18n()
</script>

<template>
  <div class="tool-layout">
    <h2 class="tool-title">{{ title }}</h2>
    <div class="tool-content">
      <div class="tool-panel input-panel">
        <div class="panel-header">
          <span class="panel-label">{{ inputLabel || t('common.input') }}</span>
          <slot name="input-actions" />
        </div>
        <div class="panel-body">
          <slot name="input" />
        </div>
      </div>
      <div class="tool-actions">
        <slot name="actions" />
      </div>
      <div class="tool-panel output-panel">
        <div class="panel-header">
          <span class="panel-label">{{ outputLabel || t('common.output') }}</span>
          <slot name="output-actions" />
        </div>
        <div class="panel-body">
          <slot name="output" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tool-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: var(--spacing-lg);
}

.tool-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-md);
  min-height: 0;
}

@media (max-width: 900px) {
  .tool-content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto 1fr;
  }
}

.tool-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--bg-color-page);
  border-bottom: 1px solid var(--border-color);
}

.panel-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-color-secondary);
  text-transform: uppercase;
}

.panel-body {
  flex: 1;
  padding: var(--spacing-md);
  overflow: auto;
}

.tool-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
}

@media (max-width: 900px) {
  .tool-actions {
    flex-direction: row;
    padding: 0 var(--spacing-md);
  }
}
</style>
