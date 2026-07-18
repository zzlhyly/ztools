<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
  Film,
  Shield,
  KeyRound,
  Lock,
  Fingerprint,
  ClipboardType,
  FileCode,
  FileDiff,
  Database,
  QrCode,
  Signature,
  Key,
  Network,
  Ticket,
  Image as ImageIcon,
  FileText,
  Globe,
  ChevronLeft,
  ChevronRight,
  Search,
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
  { path: '/m3u8', icon: Film, key: 'm3u8' },
  { path: '/aes', icon: Shield, key: 'aes' },
  { path: '/rsa-keys', icon: KeyRound, key: 'rsaKeys' },
  { path: '/rsa-crypto', icon: Lock, key: 'rsaCrypto' },
  { path: '/hmac', icon: Fingerprint, key: 'hmac' },
  { path: '/uuid', icon: ClipboardType, key: 'uuid' },
  { path: '/diff', icon: FileDiff, key: 'diff' },
  { path: '/ed25519', icon: Signature, key: 'ed25519' },
  { path: '/yaml', icon: FileCode, key: 'yaml' },
  { path: '/sql', icon: Database, key: 'sql' },
  { path: '/qrcode', icon: QrCode, key: 'qrcode' },
  { path: '/password', icon: Key, key: 'password' },
  { path: '/cidr', icon: Network, key: 'cidr' },
  { path: '/jwt', icon: Ticket, key: 'jwt' },
  { path: '/image', icon: ImageIcon, key: 'image' },
  { path: '/encoding', icon: FileText, key: 'encoding' },
  { path: '/crawler', icon: Globe, key: 'siteCrawler' },
]

const searchQuery = ref('')
const searchInputRef = ref<{ focus: () => void } | null>(null)

const filteredTools = computed(() => {
  if (!searchQuery.value.trim()) return tools
  const query = searchQuery.value.toLowerCase()
  return tools.filter((tool) => {
    const name = t(`tools.${tool.key}.name`).toLowerCase()
    const desc = t(`tools.${tool.key}.description`).toLowerCase()
    return name.includes(query) || desc.includes(query)
  })
})

const recentTools = computed(() => {
  return appStore.recentTools
    .map((path) => tools.find((t) => t.path === path))
    .filter((t): t is ToolItem => !!t)
    .slice(0, 5)
})

const isActive = (path: string) => route.path === path

const navigateTo = (path: string) => {
  router.push(path)
  appStore.addRecentTool(path)
}

const handleKeydown = (e: Event) => {
  if (!(e instanceof KeyboardEvent) || e.key !== 'Enter') return
  if (filteredTools.value.length > 0) {
    navigateTo(filteredTools.value[0].path)
    searchQuery.value = ''
  }
}

const focusSearch = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', focusSearch)
})

onUnmounted(() => {
  window.removeEventListener('keydown', focusSearch)
})
</script>

<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <div class="sidebar-search">
      <el-input
        v-if="!appStore.sidebarCollapsed"
        ref="searchInputRef"
        v-model="searchQuery"
        :placeholder="t('common.search')"
        clearable
        @keydown="handleKeydown"
      >
        <template #prefix>
          <Search :size="14" />
        </template>
      </el-input>
      <div v-else class="search-collapsed">
        <Search :size="20" />
      </div>
    </div>

    <div class="sidebar-content">
      <div v-if="recentTools.length > 0 && !appStore.sidebarCollapsed" class="sidebar-section">
        <div class="section-title">
          {{ t('common.recent') }}
        </div>
        <div
          v-for="tool in recentTools"
          :key="`recent-${tool.path}`"
          class="menu-item"
          :class="{ active: isActive(tool.path) }"
          :title="t(`tools.${tool.key}.name`)"
          @click="navigateTo(tool.path)"
        >
          <component :is="tool.icon" :size="18" />
          <span class="menu-text">{{ t(`tools.${tool.key}.name`) }}</span>
        </div>
      </div>

      <div class="sidebar-section">
        <div v-if="!appStore.sidebarCollapsed" class="section-title">
          {{ t('common.allTools') }}
        </div>
        <div
          v-for="tool in filteredTools"
          :key="tool.path"
          class="menu-item"
          :class="{ active: isActive(tool.path) }"
          :title="t(`tools.${tool.key}.name`)"
          @click="navigateTo(tool.path)"
        >
          <component :is="tool.icon" :size="18" />
          <span v-if="!appStore.sidebarCollapsed" class="menu-text">
            {{ t(`tools.${tool.key}.name`) }}
          </span>
        </div>
      </div>
    </div>

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
  background-color: var(--surface-card);
  border-right: 1px solid var(--border-color);
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-search {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.search-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
}

.sidebar-content {
  flex: 1;
  padding: var(--spacing-sm);
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: var(--spacing-md);
}

.section-title {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  font-size: var(--font-size-sm);
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
