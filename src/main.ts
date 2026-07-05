import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Global error handler — prevents white-screen on unhandled component errors
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue Error]', info, err)
  // In production, could show a user-facing toast or fallback UI
  // For now, log and let the app continue functioning
}

app.config.warnHandler = (msg, _instance, trace) => {
  // Route warnings in development only
  console.warn('[Vue Warn]', msg, trace)
}

app.mount('#app')
