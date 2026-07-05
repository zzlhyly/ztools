<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import TitleBar from '@/components/TitleBar.vue'
import GlobalToolbar from '@/components/GlobalToolbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import { useI18n } from 'vue-i18n'

const appStore = useAppStore()
const { t } = useI18n()
</script>

<template>
  <div
    class="app-container"
    :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }"
  >
    <TitleBar :title="t('app.title')" />
    <GlobalToolbar />
    <div class="app-content">
      <Sidebar />
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style>
@import './styles/variables.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  font-size: var(--font-size-md);
  color: var(--text-color-primary);
  background-color: var(--bg-color-page);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: var(--spacing-lg);
}
</style>
