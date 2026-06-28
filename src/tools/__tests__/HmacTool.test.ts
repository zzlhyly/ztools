import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import HmacTool from '../HmacTool.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/hmac', component: HmacTool }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        hmac: { name: 'HMAC Calculator' },
      },
      common: {
        input: 'Input',
        output: 'Output',
        format: 'Format',
        minify: 'Minify',
        encode: 'Encode',
        decode: 'Decode',
        copy: 'Copy',
        paste: 'Paste',
        clear: 'Clear',
        swap: 'Swap',
        convert: 'Convert',
        test: 'Test',
        calculate: 'Calculate',
        copied: 'Copied to clipboard',
        error: 'Error',
        success: 'Success',
        placeholder: 'Enter content...',
        selectFile: 'Select File',
        hashing: 'Computing...',
      },
      errors: {
        jsonSyntax: 'JSON syntax error: {message}',
        xmlSyntax: 'XML syntax error',
        invalidInput: 'Invalid input',
        unknown: 'Unknown error',
      },
    },
  },
})

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

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
  const stubs = {
    'el-button': { template: '<button><slot /></button>' },
    'el-select': { template: '<div class="el-select"><slot /></div>' },
    'el-option': { template: '<div class="el-option"><slot /></div>' },
    'el-input': { template: '<input class="el-input" />' },
    'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render textarea', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should render secret key input', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('.el-input').exists()).toBe(true)
  })

  it('should render algorithm dropdown', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n], stubs },
    })
    const options = wrapper.findAll('.el-option')
    expect(options.length).toBe(4)
  })

  it('should have calculate and clear buttons', () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n], stubs },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().includes('Calculate')).length).toBe(1)
    expect(buttons.filter(b => b.text().includes('Clear')).length).toBe(1)
  })

  it('should clear input and output', async () => {
    const wrapper = mount(HmacTool, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test message')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(b => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect((textarea.element as HTMLTextAreaElement).value).toBe('')
  })
})
