<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import {
  Braces,
  Code2,
  Binary,
  Link,
  Clock,
  Regex,
  Palette,
  Hash,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'
import type { Component } from 'vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const appStore = useAppStore()

interface ToolItem {
  path: string
  icon: Component
  key: string
}

const tools: ToolItem[] = [
  { path: '/json', icon: Braces, key: 'json' },
  { path: '/xml', icon: Code2, key: 'xml' },
  { path: '/base64', icon: Binary, key: 'base64' },
  { path: '/url', icon: Link, key: 'url' },
  { path: '/timestamp', icon: Clock, key: 'timestamp' },
  { path: '/regex', icon: Regex, key: 'regex' },
  { path: '/color', icon: Palette, key: 'color' },
  { path: '/hash', icon: Hash, key: 'hash' },
]

const isActive = (path: string) => route.path === path

const navigateTo = (path: string) => {
  router.push(path)
  appStore.addRecentTool(path)
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <nav class="sidebar-nav">
      <div
        v-for="tool in tools"
        :key="tool.path"
        class="menu-item"
        :class="{ active: isActive(tool.path) }"
        :title="t(`tools.${tool.key}.name`)"
        @click="navigateTo(tool.path)"
      >
        <component :is="tool.icon" :size="20" />
        <span v-if="!appStore.sidebarCollapsed" class="menu-text">
          {{ t(`tools.${tool.key}.name`) }}
        </span>
      </div>
    </nav>
    <button class="toggle-button" @click="appStore.toggleSidebar()">
      <ChevronLeft v-if="!appStore.sidebarCollapsed" :size="16" />
      <ChevronRight v-else :size="16" />
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  background-color: var(--bg-color);
  border-right: 1px solid var(--border-color);
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-nav {
  flex: 1;
  padding: var(--spacing-sm);
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-xs);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-color-regular);
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
}

.menu-item:hover {
  background-color: var(--bg-color-page);
  color: var(--text-color-primary);
}

.menu-item.active {
  background-color: var(--color-primary);
  color: white;
}

.menu-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  border: none;
  background: transparent;
  color: var(--text-color-secondary);
  cursor: pointer;
  border-top: 1px solid var(--border-color);
}

.toggle-button:hover {
  color: var(--text-color-primary);
  background-color: var(--bg-color-page);
}
</style>
