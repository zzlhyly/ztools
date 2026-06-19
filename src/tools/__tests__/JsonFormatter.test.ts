import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import JsonFormatter from '../JsonFormatter.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/json', component: JsonFormatter }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        json: { name: 'JSON Formatter' },
      },
      common: {
        input: 'Input',
        output: 'Output',
        format: 'Format',
        minify: 'Minify',
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

// Mock ElMessage
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('JsonFormatter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render input textarea', () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should format JSON on button click', async () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"name":"test","age":18}')

    const formatButton = wrapper.find('.format-button')
    await formatButton.trigger('click')

    const output = wrapper.find('.output-content')
    expect(output.text()).toContain('"name": "test"')
    expect(output.text()).toContain('"age": 18')
  })

  it('should show error for invalid JSON', async () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{invalid}')

    const formatButton = wrapper.find('.format-button')
    await formatButton.trigger('click')

    expect(wrapper.find('.error-message').exists()).toBe(true)
  })

  it('should minify JSON', async () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{\n  "name": "test",\n  "age": 18\n}')

    const minifyButton = wrapper.find('.minify-button')
    await minifyButton.trigger('click')

    const output = wrapper.find('.output-content')
    expect(output.text()).toBe('{"name":"test","age":18}')
  })

  it('should clear input and output', async () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"test": true}')

    const clearButton = wrapper.find('.clear-button')
    await clearButton.trigger('click')

    expect(textarea.element.value).toBe('')
  })
})