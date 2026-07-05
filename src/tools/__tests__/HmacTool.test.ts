import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import HmacTool from '../HmacTool.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/hmac', component: HmacTool }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

vi.mock('@/utils/crypto', () => ({
  computeHmac: vi.fn().mockResolvedValue('abc123'),
  detectKeyFormat: vi.fn().mockReturnValue('text'),
  parseKeyBytes: vi.fn().mockReturnValue(new Uint8Array([0])),
  CryptoError: class CryptoError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'CryptoError'
    }
  },
}))

describe('HmacTool', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render textarea', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should render secret key input', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('.el-input').exists()).toBe(true)
  })

  it('should render algorithm dropdown', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('.el-select').exists()).toBe(true)
  })

  it('should have calculate and clear buttons', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter((b) => b.text().includes('Calculate')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Clear')).length).toBe(1)
  })

  it('should clear input and output', async () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test message')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find((b) => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })
})
