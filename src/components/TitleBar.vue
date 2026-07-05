<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Minus, X, Maximize2, Wrench } from 'lucide-vue-next'
import { minimizeWindow, maximizeWindow, closeWindow } from '@/utils/window'

withDefaults(
  defineProps<{
    title?: string
  }>(),
  {
    title: 'ztools',
  },
)

const isMac = ref(false)

onMounted(() => {
  isMac.value = navigator.platform.includes('Mac')
})
</script>

<template>
  <div
    data-tauri-drag-region
    class="titlebar"
    :class="{ 'is-mac': isMac }"
  >
    <div
      class="titlebar-brand"
      :style="{ paddingLeft: isMac ? '70px' : '16px' }"
    >
      <Wrench
        :size="14"
        class="brand-icon"
      />
      <span class="titlebar-title">{{ title }}</span>
    </div>
    <div
      v-if="!isMac"
      class="titlebar-controls"
    >
      <button
        class="titlebar-button"
        @click="minimizeWindow"
      >
        <Minus :size="14" />
      </button>
      <button
        class="titlebar-button"
        @click="maximizeWindow"
      >
        <Maximize2 :size="14" />
      </button>
      <button
        class="titlebar-button close"
        @click="closeWindow"
      >
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--titlebar-height);
  background-color: var(--surface-card);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  -webkit-user-select: none;
}

.titlebar-brand {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.brand-icon {
  color: var(--color-primary);
}

.titlebar-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-title);
}

.titlebar-controls {
  display: flex;
  height: 100%;
}

.titlebar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-color-regular);
  cursor: pointer;
  transition: background-color 0.2s;
}

.titlebar-button:hover {
  background-color: var(--bg-color-page);
}

.titlebar-button.close:hover {
  background-color: var(--color-danger);
  color: white;
}
</style>
