<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, RotateCcw, Home } from 'lucide-vue-next'

defineProps<{
  message?: string
}>()

const emit = defineEmits<{
  retry: []
}>()

const router = useRouter()
const { t } = useI18n()

function handleRetry() {
  emit('retry')
}

function handleGoHome() {
  router.push('/')
}
</script>

<template>
  <div class="error-fallback">
    <div class="error-fallback__card">
      <AlertTriangle class="error-fallback__icon" :size="48" />
      <h2 class="error-fallback__title">
        {{ t('error.title') }}
      </h2>
      <p class="error-fallback__message">
        {{ message || t('error.defaultMessage') }}
      </p>
      <div class="error-fallback__actions">
        <el-button type="primary" :icon="RotateCcw" @click="handleRetry">
          {{ t('error.retry') }}
        </el-button>
        <el-button :icon="Home" @click="handleGoHome">
          {{ t('error.goHome') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--spacing-xl);
}

.error-fallback__card {
  text-align: center;
  max-width: 400px;
}

.error-fallback__icon {
  color: var(--el-color-warning);
  margin-bottom: var(--spacing-md);
}

.error-fallback__title {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-sm);
  color: var(--text-color-primary);
}

.error-fallback__message {
  font-size: var(--font-size-md);
  color: var(--text-color-secondary);
  margin-bottom: var(--spacing-lg);
}

.error-fallback__actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
}
</style>
