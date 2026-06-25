<script setup lang="ts">
// Layout wrapper for action buttons
</script>

<template>
  <div class="tool-action-bar">
    <slot />
  </div>
</template>

<style scoped>
.tool-action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
}
</style>
