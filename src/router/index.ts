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
  { path: '/diff', component: () => import('@/tools/TextDiff.vue') },
  { path: '/ed25519', component: () => import('@/tools/Ed25519Tool.vue') },
  { path: '/yaml', component: () => import('@/tools/YamlConverter.vue') },
  { path: '/sql', component: () => import('@/tools/SqlFormatter.vue') },
  { path: '/qrcode', component: () => import('@/tools/QrcodeGenerator.vue') },
  { path: '/password', component: () => import('@/tools/PasswordGenerator.vue') },
  { path: '/cidr', component: () => import('@/tools/CidrCalculator.vue') },
  { path: '/jwt', component: () => import('@/tools/JwtDebugger.vue') },
  { path: '/image', component: () => import('@/tools/ImageConverter.vue') },
  { path: '/encoding', component: () => import('@/tools/EncodingConverter.vue') },
  { path: '/crawler', component: () => import('@/tools/SiteCrawler.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
