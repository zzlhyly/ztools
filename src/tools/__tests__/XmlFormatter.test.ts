import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import XmlFormatter from '../XmlFormatter.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/xml', component: XmlFormatter }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

describe('XmlFormatter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render input textarea', () => {
    const wrapper = mount(XmlFormatter, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should format XML on button click', async () => {
    const wrapper = mount(XmlFormatter, {
      global: { plugins: [router, i18n] },
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
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('<root><unclosed>')

    const formatButton = wrapper.find('button')
    await formatButton.trigger('click')

    expect(wrapper.find('.el-alert').exists()).toBe(true)
  })

  it('should clear input and output', async () => {
    const wrapper = mount(XmlFormatter, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('<root>test</root>')

    const clearButton = wrapper.findAll('button').at(1)
    await clearButton!.trigger('click')

    expect(textarea.element.value).toBe('')
  })
})
