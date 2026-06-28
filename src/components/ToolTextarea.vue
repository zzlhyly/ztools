<script setup lang="ts">
const model = defineModel<string>()

interface Props {
  placeholder?: string
  submitHotkey?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  submitHotkey: false,
})

const emit = defineEmits<{
  submit: []
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (props.submitHotkey && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    emit('submit')
  }
}
</script>

<template>
  <textarea
    v-model="model"
    class="tool-textarea"
    :placeholder="placeholder"
    @keydown="handleKeydown"
  />
</template>

<style scoped>
.tool-textarea {
  width: 100%;
  min-height: 300px;
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
