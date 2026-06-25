import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import RegexTester from '../RegexTester.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/regex', component: RegexTester }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        regex: { name: 'Regex Tester' },
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

describe('RegexTester', () => {
  const stubs = {
    'el-button': { template: '<button><slot /></button>' },
    'el-checkbox-group': { template: '<div><slot /></div>' },
    'el-checkbox': { template: '<label class="el-checkbox"><slot /></label>' },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render regex input', () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('.regex-input').exists()).toBe(true)
  })

  it('should match regex pattern', async () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n], stubs },
    })
    const regexInput = wrapper.find('.regex-input')
    await regexInput.setValue('\\d+')

    const testInput = wrapper.find('.test-input')
    await testInput.setValue('abc123def456')

    const checkboxes = wrapper.findAll('.el-checkbox')
    const gCheckbox = checkboxes.find(c => c.text().includes('global'))!
    await gCheckbox.trigger('click')

    const buttons = wrapper.findAll('button')
    const testButton = buttons.find(b => b.text().includes('Test'))!
    await testButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('123')
    expect(output.text()).toContain('456')
  })

  it('should support global flag', async () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n], stubs },
    })
    const regexInput = wrapper.find('.regex-input')
    await regexInput.setValue('\\d+')

    const testInput = wrapper.find('.test-input')
    await testInput.setValue('1 2 3')

    const checkboxes = wrapper.findAll('.el-checkbox')
    const gCheckbox = checkboxes.find(c => c.text().includes('global'))!
    await gCheckbox.trigger('click')

    const buttons = wrapper.findAll('button')
    const testButton = buttons.find(b => b.text().includes('Test'))!
    await testButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('1')
    expect(output.text()).toContain('2')
    expect(output.text()).toContain('3')
  })

  it('should show no matches message', async () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n], stubs },
    })
    const regexInput = wrapper.find('.regex-input')
    await regexInput.setValue('\\d+')

    const testInput = wrapper.find('.test-input')
    await testInput.setValue('no numbers here')

    const buttons = wrapper.findAll('button')
    const testButton = buttons.find(b => b.text().includes('Test'))!
    await testButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('No matches')
  })

  it('should clear input and output', async () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n], stubs },
    })
    const regexInput = wrapper.find('.regex-input')
    await regexInput.setValue('\\d+')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(b => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect(regexInput.element.value).toBe('')
  })
})
