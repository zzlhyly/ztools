import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import XmlFormatter from '../XmlFormatter.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/xml', component: XmlFormatter }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        xml: { name: 'XML Formatter' },
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

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))


describe('XmlFormatter', () => {
  const stubs = {
    'el-button': { template: '<button><slot /></button>' },
    'el-alert': { template: '<div class="el-alert"><slot /></div>' },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render input textarea', () => {
    const wrapper = mount(XmlFormatter, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should format XML on button click', async () => {
    const wrapper = mount(XmlFormatter, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('<root><name>test</name><age>18</age></root>')

    const formatButton = wrapper.find('button')
    await formatButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('<root>')
    expect(output.text()).toContain('<name>test')
    expect(output.text()).toContain('</name>')
  })

  it('should show error for invalid XML', async () => {
    const wrapper = mount(XmlFormatter, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('<root><unclosed>')

    const formatButton = wrapper.find('button')
    await formatButton.trigger('click')

    expect(wrapper.find('.el-alert').exists()).toBe(true)
  })

  it('should clear input and output', async () => {
    const wrapper = mount(XmlFormatter, {
      global: { plugins: [router, i18n], stubs },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('<root>test</root>')

    const clearButton = wrapper.findAll('button').at(1)
    await clearButton!.trigger('click')

    expect(textarea.element.value).toBe('')
  })
})
