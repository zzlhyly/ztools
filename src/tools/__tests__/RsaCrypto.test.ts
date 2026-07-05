import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/rsa-crypto', component: {} as any }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

vi.mock('@/utils/crypto', () => ({
  rsaEncrypt: vi.fn().mockResolvedValue('ZW5jcnlwdGVk'),
  rsaDecrypt: vi.fn().mockResolvedValue('decrypted text'),
  rsaSign: vi.fn().mockResolvedValue('c2lnbmVk'),
  rsaVerify: vi.fn().mockResolvedValue(true),
  getRsaMaxPayload: vi.fn().mockReturnValue(190),
  CryptoError: class CryptoError extends Error {
    name = 'CryptoError'
    constructor(m: string) {
      super(m)
    }
  },
  arrayBufferToHex: vi.fn().mockReturnValue('hex'),
  base64ToArrayBuffer: vi.fn().mockReturnValue(new ArrayBuffer(0)),
}))

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

describe('RsaCrypto', () => {
  it('should render textarea', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should render encrypt padding, sign padding, and output format dropdowns', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n] },
    })
    const selects = wrapper.findAll('.el-select')
    expect(selects.length).toBe(3)
  })

  it('should render 5 operation buttons', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter((b) => b.text().includes('Encrypt')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Decrypt')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Sign')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Verify')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Clear')).length).toBe(1)
  })

  it('should render key input fields', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n] },
    })
    const textareas = wrapper.findAll('textarea')
    expect(textareas.length).toBe(3)
  })
})
