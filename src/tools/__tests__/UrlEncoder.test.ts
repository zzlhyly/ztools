import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import UrlEncoder from '../UrlEncoder.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/url', component: UrlEncoder }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

describe('UrlEncoder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render input textarea', () => {
    const wrapper = mount(UrlEncoder, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should encode URL', async () => {
    const wrapper = mount(UrlEncoder, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('https://example.com/path?q=hello world')

    const buttons = wrapper.findAll('button')
    const encodeButton = buttons.find(b => b.text().includes('Encode'))!
    await encodeButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('https%3A%2F%2Fexample.com')
  })

  it('should decode URL', async () => {
    const wrapper = mount(UrlEncoder, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('https%3A%2F%2Fexample.com%2Fpath%3Fq%3Dhello%20world')

    const buttons = wrapper.findAll('button')
    const decodeButton = buttons.find(b => b.text().includes('Decode'))!
    await decodeButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toBe('https://example.com/path?q=hello world')
  })

  it('should clear input and output', async () => {
    const wrapper = mount(UrlEncoder, {
      global: { plugins: [router, i18n] },
    })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('test')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(b => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect(textarea.element.value).toBe('')
  })
})
