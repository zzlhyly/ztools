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

describe('HashCalculator', () => {
  const stubs = {
    'el-button': { template: '<button><slot /></button>' },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render input textarea', () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should calculate SHA-1 hash', async () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello World')

    const buttons = wrapper.findAll('button')
    const calculateButton = buttons.find(b => b.text().includes('Calculate'))!
    await calculateButton.trigger('click')

    await new Promise((resolve) => setTimeout(resolve, 100))

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('SHA-1')
    expect(output.text()).toContain('SHA-256')
  })

  it('should show all hash algorithms', async () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test')

    const buttons = wrapper.findAll('button')
    const calculateButton = buttons.find(b => b.text().includes('Calculate'))!
    await calculateButton.trigger('click')

    await new Promise((resolve) => setTimeout(resolve, 100))

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('SHA-1')
    expect(output.text()).toContain('SHA-256')
    expect(output.text()).toContain('SHA-384')
    expect(output.text()).toContain('SHA-512')
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
