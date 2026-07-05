import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import TimestampConverter from '../TimestampConverter.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/timestamp', component: TimestampConverter }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

describe('TimestampConverter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render timestamp input', () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('.timestamp-input').exists()).toBe(true)
  })

  it('should convert timestamp to date', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n] },
    })
    const input = wrapper.find('.timestamp-input')
    await input.setValue('1609459200')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find((b) => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('2021')
  })

  it('should convert date to timestamp', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n] },
    })
    const input = wrapper.find('.date-input')
    await input.setValue('2021-01-01T00:00:00')

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find((b) => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    const timestamp = parseInt(output.text())
    expect(timestamp).toBeGreaterThan(1609400000)
    expect(timestamp).toBeLessThan(1609500000)
  })

  it('should support millisecond unit', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n] },
    })
    const input = wrapper.find('.timestamp-input')
    await input.setValue('1609459200000')

    const radios = wrapper.findAll('.el-radio')
    const msRadioInput = radios.find((r) => r.text().includes('Milliseconds'))!.find('input')
    await msRadioInput.setValue(true)

    const buttons = wrapper.findAll('button')
    const convertButton = buttons.find((b) => b.text().includes('Convert'))!
    await convertButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.text()).toContain('2021')
  })

  it('should clear input and output', async () => {
    const wrapper = mount(TimestampConverter, {
      global: { plugins: [router, i18n] },
    })
    const input = wrapper.find('.timestamp-input')
    await input.setValue('1609459200')

    const buttons = wrapper.findAll('button')
    const clearButton = buttons.find((b) => b.text().includes('Clear'))!
    await clearButton.trigger('click')

    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
