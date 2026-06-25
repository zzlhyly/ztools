import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import Base64Tool from '../Base64Tool.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/base64', component: Base64Tool }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        base64: { name: 'Base64 Encoder/Decoder' },
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

describe('Base64Tool', () => {
  const stubs = {
    'el-button': { template: '<button><slot /></button>' },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render input textarea', () => {
    const wrapper = mount(Base64Tool, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should encode text to Base64', async () => {
    const wrapper = mount(Base64Tool, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello World')

    const buttons = wrapper.findAll('button')
    const encodeButton = buttons.find(b => b.text().includes('Encode'))!
    await encodeButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toBe('SGVsbG8gV29ybGQ=')
  })

  it('should decode Base64 to text', async () => {
    const wrapper = mount(Base64Tool, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('SGVsbG8gV29ybGQ=')

    const buttons = wrapper.findAll('button')
    const decodeButton = buttons.find(b => b.text().includes('Decode'))!
    await decodeButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toBe('Hello World')
  })

  it('should handle UTF-8 text', async () => {
    const wrapper = mount(Base64Tool, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('你好世界')

    const buttons = wrapper.findAll('button')
    const encodeButton = buttons.find(b => b.text().includes('Encode'))!
    await encodeButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toBeTruthy()
  })

  it('should clear input and output', async () => {
    const wrapper = mount(Base64Tool, {
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
