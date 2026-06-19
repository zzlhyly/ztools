import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const theme = ref<'light' | 'dark' | 'system'>(
    (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system'
  )
  const sidebarCollapsed = ref(false)
  const recentTools = ref<string[]>(
    JSON.parse(localStorage.getItem('recentTools') || '[]')
  )
  const locale = ref(localStorage.getItem('locale') || 'zh-CN')

  // Computed - 自动响应 theme 变化
  const isDark = computed(() => {
    if (theme.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value === 'dark'
  })

  // Watch theme changes and update DOM
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
  })

  // Watch isDark changes and update DOM class
  watch(isDark, (dark) => {
    document.documentElement.classList.toggle('dark', dark)
  }, { immediate: true })

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
    const filtered = recentTools.value.filter(p => p !== path)
    recentTools.value = [path, ...filtered].slice(0, 10)
    localStorage.setItem('recentTools', JSON.stringify(recentTools.value))
  }

  return {
    theme,
    sidebarCollapsed,
    recentTools,
    locale,
    isDark,
    setTheme,
    setLocale,
    toggleSidebar,
    addRecentTool,
  }
})
