import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import HashCalculator from '../HashCalculator.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/hash', component: HashCalculator }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        hash: { name: 'Hash Calculator' },
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

vi.mock('@/utils/hash', () => ({
  HASH_ALGORITHMS: [
    { label: 'MD5', value: 'MD5' },
    { label: 'SHA-1', value: 'SHA-1' },
    { label: 'SHA-256', value: 'SHA-256' },
    { label: 'SHA-384', value: 'SHA-384' },
    { label: 'SHA-512', value: 'SHA-512' },
    { label: 'SHA3-256', value: 'SHA3-256' },
    { label: 'SHA3-512', value: 'SHA3-512' },
  ],
  calculateHash: vi.fn().mockResolvedValue('abc123'),
  hashFile: vi.fn().mockResolvedValue('def456'),
}))

describe('HashCalculator', () => {
  const stubs = {
    'el-button': { template: '<button><slot /></button>' },
    'el-select': { template: '<div class="el-select"><slot /></div>' },
    'el-option': { template: '<div class="el-option"><slot /></div>' },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render textarea', () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should render algorithm dropdown', () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n], stubs },
    })
    const options = wrapper.findAll('.el-option')
    expect(options.length).toBe(7)
  })

  it('should have calculate and clear buttons', () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n], stubs },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().includes('Calculate')).length).toBe(1)
    expect(buttons.filter(b => b.text().includes('Clear')).length).toBe(1)
  })

  it('should clear input and output', async () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(b => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect(textarea.element.value).toBe('')
  })
})
