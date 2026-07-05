<script setup lang="ts">
interface Props {
  content: string
  error?: string
  language?: 'json' | 'xml' | 'text'
}

withDefaults(defineProps<Props>(), {
  error: '',
  language: 'text',
})
</script>

<template>
  <div class="code-output">
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
    <div
      v-else-if="content"
      class="code-content"
    >
      <pre><code>{{ content }}</code></pre>
    </div>
    <div
      v-else
      class="empty-state"
    >
      {{ $t('common.output') }}
    </div>
  </div>
</template>

<style scoped>
.code-output {
  flex: 1;
  min-height: 0;
}

.code-content {
  flex: 1;
  min-height: 0;
  padding: var(--spacing-md);
  background-color: var(--bg-color-page);
  border-radius: var(--radius-md);
  overflow: auto;
}

.code-content pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  color: var(--text-color-placeholder);
  font-size: var(--font-size-sm);
}
</style>
