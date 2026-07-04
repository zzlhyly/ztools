import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ColorConverter from '../ColorConverter.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/color', component: ColorConverter }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

describe('ColorConverter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render color input', () => {
    const wrapper = mount(ColorConverter, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('input[placeholder="#ff0000"]').exists()).toBe(true)
  })

  it('should convert HEX to RGB', async () => {
    const wrapper = mount(ColorConverter, {
      global: { plugins: [router, i18n] },
    })
    const input = wrapper.find('input[placeholder="#ff0000"]')
    await input.setValue('#ff0000')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find(b => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('255')
    expect(output.text()).toContain('0')
    expect(output.text()).toContain('0')
  })

  it('should convert RGB to HEX', async () => {
    const wrapper = mount(ColorConverter, {
      global: { plugins: [router, i18n] },
    })
    const hexInput = wrapper.find('input[placeholder="#ff0000"]')
    await hexInput.setValue('')

    const inputs = wrapper.findAll('input')
    const rInput = inputs.find(i => i.attributes('placeholder') === 'R')!
    await rInput.setValue('255')

    const gInput = inputs.find(i => i.attributes('placeholder') === 'G')!
    await gInput.setValue('0')

    const bInput = inputs.find(i => i.attributes('placeholder') === 'B')!
    await bInput.setValue('0')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find(b => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('HEX:')
    expect(output.text()).toContain('RGB:')
  })

  it('should show color preview', async () => {
    const wrapper = mount(ColorConverter, {
      global: { plugins: [router, i18n] },
    })
    const input = wrapper.find('input[placeholder="#ff0000"]')
    await input.setValue('#00ff00')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find(b => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const preview = wrapper.find('.color-preview')
    expect(preview.exists()).toBe(true)
  })

  it('should clear input and output', async () => {
    const wrapper = mount(ColorConverter, {
      global: { plugins: [router, i18n] },
    })
    const input = wrapper.find('input[placeholder="#ff0000"]')
    await input.setValue('#ff0000')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find(b => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
