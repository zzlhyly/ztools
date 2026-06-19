<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { Moon, Sun, Monitor } from 'lucide-vue-next'

defineProps<{
  title: string
}>()

const appStore = useAppStore()
</script>

<template>
  <header class="titlebar" data-tauri-drag-region>
    <span class="titlebar-title">{{ title }}</span>
    <div class="titlebar-actions">
      <el-dropdown @command="appStore.setTheme" trigger="click">
        <el-button :icon="appStore.isDark ? Moon : Sun" circle size="small" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item :icon="Sun" command="light">Light</el-dropdown-item>
            <el-dropdown-item :icon="Moon" command="dark">Dark</el-dropdown-item>
            <el-dropdown-item :icon="Monitor" command="system">System</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--titlebar-height);
  padding: 0 var(--spacing-md);
  background-color: var(--bg-color);
  border-bottom: 1px solid var(--border-color-lighter);
  user-select: none;
}

.titlebar-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-color-primary);
}

.titlebar-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
</style>
