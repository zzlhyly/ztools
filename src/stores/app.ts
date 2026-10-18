import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

// 读取 localStorage 中的 JSON，解析失败时返回默认值
function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T
  } catch {
    return fallback
  }
}

export const useAppStore = defineStore('app', () => {
  // State
  const theme = ref<'light' | 'dark' | 'system'>(
    (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system',
  )
  const sidebarCollapsed = ref(false)
  const recentTools = ref<string[]>(loadStoredJson('recentTools', [] as string[]))
  const toolInputs = ref<Record<string, string>>(loadStoredJson('toolInputs', {}))
  const locale = ref(localStorage.getItem('locale') || 'zh-CN')

  // 系统深色模式，响应运行中的系统主题切换
  const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(systemDarkQuery.matches)
  systemDarkQuery.addEventListener('change', (e) => {
    systemDark.value = e.matches
  })

  // Computed
  const isDark = computed(() => {
    if (theme.value === 'system') {
      return systemDark.value
    }
    return theme.value === 'dark'
  })

  // Watch theme changes and update DOM
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
  })

  // Watch isDark changes and update DOM class
  watch(
    isDark,
    (dark) => {
      document.documentElement.classList.toggle('dark', dark)
    },
    { immediate: true },
  )

  // Watch locale changes
  watch(locale, (newLocale) => {
    localStorage.setItem('locale', newLocale)
  })

  // Actions
  function setTheme(newTheme: 'light' | 'dark' | 'system') {
    theme.value = newTheme
  }

  function setLocale(newLocale: string) {
    locale.value = newLocale
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function addRecentTool(path: string) {
    const filtered = recentTools.value.filter((p) => p !== path)
    recentTools.value = [path, ...filtered].slice(0, 10)
    localStorage.setItem('recentTools', JSON.stringify(recentTools.value))
  }

  function getToolInput(path: string): string {
    return toolInputs.value[path] || ''
  }

  function saveToolInput(path: string, value: string) {
    if (value) {
      toolInputs.value[path] = value
    } else {
      delete toolInputs.value[path]
    }
    localStorage.setItem('toolInputs', JSON.stringify(toolInputs.value))
  }

  return {
    theme,
    sidebarCollapsed,
    recentTools,
    toolInputs,
    locale,
    isDark,
    setTheme,
    setLocale,
    toggleSidebar,
    addRecentTool,
    getToolInput,
    saveToolInput,
  }
})
