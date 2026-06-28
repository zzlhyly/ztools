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
  { path: '/m3u8', component: () => import('@/tools/M3u8Downloader.vue') },
  { path: '/aes', component: () => import('@/tools/AesTool.vue') },
  { path: '/rsa-keys', component: () => import('@/tools/RsaKeyGen.vue') },
  { path: '/rsa-crypto', component: () => import('@/tools/RsaCrypto.vue') },
  { path: '/hmac', component: () => import('@/tools/HmacTool.vue') },
  { path: '/uuid', component: () => import('@/tools/UuidTool.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
