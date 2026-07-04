import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import RegexTester from '../RegexTester.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/regex', component: RegexTester }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

describe('RegexTester', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render regex input', () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('.regex-input').exists()).toBe(true)
  })

  it('should match regex pattern', async () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n] },
    })
    const regexInput = wrapper.find('.regex-input')
    await regexInput.setValue('\\d+')

    const testInput = wrapper.find('.test-input')
    await testInput.setValue('abc123def456')

    const checkboxes = wrapper.findAll('.el-checkbox')
    const gCheckboxInput = checkboxes.find(c => c.text().includes('global'))!.find('input')
    await gCheckboxInput.setValue(true)

    const buttons = wrapper.findAll('button')
    const testButton = buttons.find(b => b.text().includes('Test'))!
    await testButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('123')
    expect(output.text()).toContain('456')
  })

  it('should support global flag', async () => {
    const wrapper = mount(RegexTester, {
      global: { plugins: [router, i18n] },
    })
    const regexInput = wrapper.find('.regex-input')
    await regexInput.setValue('\\d+')

    const testInput = wrapper.find('.test-input')
    await testInput.setValue('1 2 3')

    const checkboxes = wrapper.findAll('.el-checkbox')
    const gCheckboxInput = checkboxes.find(c => c.text().includes('global'))!.find('input')
    await gCheckboxInput.setValue(true)

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
      global: { plugins: [router, i18n] },
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
      global: { plugins: [router, i18n] },
    })
    const regexInput = wrapper.find('.regex-input')
    await regexInput.setValue('\\d+')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(b => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect((regexInput.element as HTMLInputElement).value).toBe('')
  })
})
