import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import JsonFormatter from '../JsonFormatter.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/json', component: JsonFormatter }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

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

    const buttons = wrapper.findAll('button')
    const formatButton = buttons.find((b) => b.text().includes('Format'))!
    await formatButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('"name": "test"')
    expect(output.text()).toContain('"age": 18')
  })

  it('should show error for invalid JSON', async () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{invalid}')

    const buttons = wrapper.findAll('button')
    const formatButton = buttons.find((b) => b.text().includes('Format'))!
    await formatButton.trigger('click')

    expect(wrapper.find('.el-alert').exists()).toBe(true)
  })

  it('should minify JSON', async () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{\n  "name": "test",\n  "age": 18\n}')

    const buttons = wrapper.findAll('button')
    const minifyButton = buttons.find((b) => b.text().includes('Minify'))!
    await minifyButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toBe('{"name":"test","age":18}')
  })

  it('should clear input and output', async () => {
    const wrapper = mount(JsonFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('{"test": true}')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find((b) => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect(textarea.element.value).toBe('')
  })
})
