import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/json' },
  { path: '/json', component: () => import('@/tools/JsonFormatter.vue') },
  { path: '/xml', component: () => import('@/tools/XmlFormatter.vue') },
  { path: '/base64', component: () => import('@/tools/Base64Tool.vue') },
  { path: '/url', component: () => import('@/tools/UrlEncoder.vue') },
  { path: '/timestamp', component: () => import('@/tools/TimestampConverter.vue') },
  { path: '/regex', component: () => import('@/tools/RegexTester.vue') },
  { path: '/color', component: () => import('@/tools/ColorConverter.vue') },
  { path: '/hash', component: () => import('@/tools/HashCalculator.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
