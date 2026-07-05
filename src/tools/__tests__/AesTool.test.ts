import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import AesTool from '../AesTool.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/aes', component: AesTool }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

vi.mock('@/utils/crypto', () => ({
  aesEncrypt: vi.fn().mockResolvedValue('ZW5jcnlwdGVk'),
  aesDecrypt: vi.fn().mockResolvedValue('decrypted text'),
  generateAesKey: vi.fn().mockResolvedValue('00112233445566778899aabbccddeeff'),
  generateAesIv: vi.fn().mockReturnValue('00112233445566778899aabbccddeeff'),
  CryptoError: class CryptoError extends Error {
    name = 'CryptoError'
    constructor(m: string) {
      super(m)
    }
  },
  arrayBufferToHex: vi.fn().mockReturnValue('hex'),
  base64ToArrayBuffer: vi.fn().mockReturnValue(new ArrayBuffer(0)),
  hexToArrayBuffer: vi.fn().mockReturnValue(new ArrayBuffer(0)),
  arrayBufferToBase64: vi.fn().mockReturnValue('base64'),
}))

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

describe('AesTool', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render textarea', () => {
    const wrapper = mount(AesTool, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should render mode dropdown options', () => {
    const wrapper = mount(AesTool, {
      global: { plugins: [router, i18n] },
    })
    const selects = wrapper.findAll('.el-select')
    expect(selects.length).toBeGreaterThan(0)
  })

  it('should have encrypt, decrypt and clear buttons', () => {
    const wrapper = mount(AesTool, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter((b) => b.text().includes('Encrypt')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Decrypt')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Clear')).length).toBe(1)
  })

  it('should render key and IV input fields', () => {
    const wrapper = mount(AesTool, {
      global: { plugins: [router, i18n] },
    })
    const inputs = wrapper.findAll('.el-input')
    expect(inputs.length).toBe(2)
  })

  it('should clear all fields', async () => {
    const wrapper = mount(AesTool, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test input')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find((b) => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect(textarea.element.value).toBe('')
  })
})
