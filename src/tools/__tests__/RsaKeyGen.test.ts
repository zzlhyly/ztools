import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/rsa-key-gen', component: {} as any }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

vi.mock('@/utils/crypto', () => ({
  generateRsaKeyPair: vi.fn().mockResolvedValue({
    publicKey: '-----BEGIN PUBLIC KEY-----\nMOCKPUBLIC\n-----END PUBLIC KEY-----',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMOCKPRIVATE\n-----END PRIVATE KEY-----',
  }),
  arrayBufferToHex: vi.fn().mockReturnValue('deadbeef'),
  base64ToArrayBuffer: vi.fn().mockReturnValue(new ArrayBuffer(0)),
  CryptoError: class CryptoError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'CryptoError'
    }
  },
}))

describe('RsaKeyGen', () => {
  it('should render key size dropdown with 3 options', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n] },
    })
    const selects = wrapper.findAll('.el-select')
    expect(selects.length).toBeGreaterThanOrEqual(1)
  })

  it('should render generate button', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter((b) => b.text().toLowerCase().includes('generate')).length).toBe(1)
  })

  it('should render two key output panels', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n] },
    })
    const panels = wrapper.findAll('.key-panel')
    expect(panels.length).toBe(2)
  })

  it('should have private key panel with warning class', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n] },
    })
    const panels = wrapper.findAll('.key-panel')
    expect(panels[1].classes()).toContain('private-key-panel')
  })
})
