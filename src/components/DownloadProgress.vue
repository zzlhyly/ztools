<script setup lang="ts">
interface Props {
  progress: number
  speed: string
  downloaded: number
  total: number
  status: string
}

const props = defineProps<Props>()
</script>

<template>
  <div class="download-progress">
    <div class="progress-header">
      <span class="progress-percent">{{ props.progress }}%</span>
      <span class="progress-speed">{{ props.speed || '—' }}</span>
      <span class="progress-count">{{ props.downloaded }} / {{ props.total }}</span>
    </div>
    <div class="progress-bar-track" role="progressbar">
      <div
        class="progress-bar-fill"
        :style="{ width: props.progress + '%' }"
        :class="{ 'is-complete': props.status === 'done', 'is-error': props.status === 'error' }"
      />
    </div>
  </div>
</template>

<style scoped>
.download-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
}

.progress-percent {
  font-weight: 600;
  min-width: 36px;
}

.progress-bar-track {
  height: 6px;
  background-color: var(--bg-color-page, #f5f7fa);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: var(--color-primary, #409eff);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar-fill.is-complete {
  background-color: var(--color-success, #67c23a);
}

.progress-bar-fill.is-error {
  background-color: var(--color-danger, #f56c6c);
}
</style>
