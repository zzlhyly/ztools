<script setup lang="ts">
const model = defineModel<string>()

interface Props {
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
})
</script>

<template>
  <textarea
    v-model="model"
    class="tool-textarea"
    :placeholder="placeholder"
  />
</template>

<style scoped>
.tool-textarea {
  width: 100%;
  height: 100%;
  min-height: 200px;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color-primary);
  transition: border-color 0.2s;
}

.tool-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.tool-textarea::placeholder {
  color: var(--text-color-placeholder);
}
</style>
