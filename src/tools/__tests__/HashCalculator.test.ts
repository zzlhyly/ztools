import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import HashCalculator from '../HashCalculator.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/hash', component: HashCalculator }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

vi.mock('@/utils/hash', () => ({
  HASH_ALGORITHMS: [
    { label: 'MD5', value: 'MD5' },
    { label: 'SHA-1', value: 'SHA-1' },
    { label: 'SHA-256', value: 'SHA-256' },
    { label: 'SHA-384', value: 'SHA-384' },
    { label: 'SHA-512', value: 'SHA-512' },
    { label: 'SHA3-256', value: 'SHA3-256' },
    { label: 'SHA3-512', value: 'SHA3-512' },
  ],
  calculateHash: vi.fn().mockResolvedValue('abc123'),
  hashFile: vi.fn().mockResolvedValue('def456'),
}))

describe('HashCalculator', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render textarea', () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should render algorithm dropdown', () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('.el-select').exists()).toBe(true)
  })

  it('should have calculate and clear buttons', () => {
    const wrapper = mount(HashCalculator, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().includes('Calculate')).length).toBe(1)
    expect(buttons.filter(b => b.text().includes('Clear')).length).toBe(1)
  })

  it('should clear input and output', async () => {
    const wrapper = mount(HashCalculator, {
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
