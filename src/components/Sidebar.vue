<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import {
  Braces,
  Code2,
  Binary,
  Link,
  Clock,
  Regex,
  Palette,
  Hash,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const { t } = useI18n()

const tools = [
  { path: '/json', icon: Braces, labelKey: 'tools.json.name' },
  { path: '/xml', icon: Code2, labelKey: 'tools.xml.name' },
  { path: '/base64', icon: Binary, labelKey: 'tools.base64.name' },
  { path: '/url', icon: Link, labelKey: 'tools.url.name' },
  { path: '/timestamp', icon: Clock, labelKey: 'tools.timestamp.name' },
  { path: '/regex', icon: Regex, labelKey: 'tools.regex.name' },
  { path: '/color', icon: Palette, labelKey: 'tools.color.name' },
  { path: '/hash', icon: Hash, labelKey: 'tools.hash.name' },
]

function navigateTo(path: string) {
  router.push(path)
  appStore.addRecentTool(path)
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <div class="sidebar-tools">
      <div
        v-for="tool in tools"
        :key="tool.path"
        class="sidebar-item"
        :class="{ active: route.path === tool.path }"
        @click="navigateTo(tool.path)"
      >
        <el-icon :size="20"><component :is="tool.icon" /></el-icon>
        <span v-if="!appStore.sidebarCollapsed" class="sidebar-label">{{ t(tool.labelKey) }}</span>
      </div>
    </div>
    <div class="sidebar-footer">
      <div class="sidebar-item" @click="appStore.toggleSidebar">
        <el-icon :size="20">
          <PanelLeftClose v-if="!appStore.sidebarCollapsed" />
          <PanelLeftOpen v-else />
        </el-icon>
        <span v-if="!appStore.sidebarCollapsed" class="sidebar-label">Collapse</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  background-color: var(--bg-color);
  border-right: 1px solid var(--border-color-lighter);
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-tools {
  flex: 1;
  padding: var(--spacing-sm);
  overflow-y: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-color-regular);
  transition: all 0.2s;
  white-space: nowrap;
}

.sidebar-item:hover {
  background-color: var(--bg-color-page);
  color: var(--text-color-primary);
}

.sidebar-item.active {
  background-color: var(--color-primary);
  color: #fff;
}

.sidebar-label {
  font-size: var(--font-size-sm);
}

.sidebar-footer {
  padding: var(--spacing-sm);
  border-top: 1px solid var(--border-color-lighter);
}
</style>
