import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import TimestampConverter from '../TimestampConverter.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/timestamp', component: TimestampConverter }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        timestamp: { name: 'Timestamp Converter' },
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

describe('TimestampConverter', () => {
  const stubs = {
    'el-button': { template: '<button><slot /></button>' },
    'el-alert': { template: '<div class="el-alert"><slot /></div>' },
    'el-radio-group': { template: '<div><slot /></div>' },
    'el-radio': { template: '<label class="el-radio"><slot /></label>' },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render timestamp input', () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('.timestamp-input').exists()).toBe(true)
  })

  it('should convert timestamp to date', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n], stubs },
    })
    const input = wrapper.find('.timestamp-input')
    await input.setValue('1609459200')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find(b => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('2021')
  })

  it('should convert date to timestamp', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n], stubs },
    })
    const input = wrapper.find('.date-input')
    await input.setValue('2021-01-01T00:00:00')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find(b => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    const timestamp = parseInt(output.text())
    expect(timestamp).toBeGreaterThan(1609400000)
    expect(timestamp).toBeLessThan(1609500000)
  })

  it('should support millisecond unit', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n], stubs },
    })
    const input = wrapper.find('.timestamp-input')
    await input.setValue('1609459200000')

    const radios = wrapper.findAll('.el-radio')
    const msRadio = radios.find(r => r.text().includes('Milliseconds'))!
    await msRadio.trigger('click')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find(b => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('2021')
  })

  it('should clear input and output', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n], stubs },
    })
    const input = wrapper.find('.timestamp-input')
    await input.setValue('1609459200')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(b => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect(input.element.value).toBe('')
  })
})
