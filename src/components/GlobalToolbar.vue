<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Moon, Sun, Globe } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const { t, locale } = useI18n()

const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
  appStore.setTheme(theme)
}

const handleLanguageChange = (lang: string) => {
  appStore.setLocale(lang)
  locale.value = lang
}
</script>

<template>
  <div class="global-toolbar">
    <el-dropdown
      trigger="click"
      @command="handleThemeChange"
    >
      <el-button
        link
        :icon="appStore.isDark ? Moon : Sun"
        size="small"
      >
        {{ t(`app.${appStore.theme}`) }}
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="light">
            {{ t('app.light') }}
          </el-dropdown-item>
          <el-dropdown-item command="dark">
            {{ t('app.dark') }}
          </el-dropdown-item>
          <el-dropdown-item command="system">
            {{ t('app.system') }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dropdown
      trigger="click"
      @command="handleLanguageChange"
    >
      <el-button
        link
        :icon="Globe"
        size="small"
      >
        {{ appStore.locale === 'zh-CN' ? '中文' : 'EN' }}
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="zh-CN">
            中文
          </el-dropdown-item>
          <el-dropdown-item command="en-US">
            English
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.global-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--surface-card);
  border-bottom: 1px solid var(--border-color);
}
</style>
