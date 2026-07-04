import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import UuidTool from '../UuidTool.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/uuid', component: UuidTool }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

vi.mock('@/utils/crypto', () => ({
  generateUuids: vi.fn((count: number) =>
    Array.from({ length: count }, (_, i) =>
      `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, '0')}`,
    ),
  ),
}))

describe('UuidTool', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render count dropdown', () => {
    const wrapper = mount(UuidTool, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.find('.el-select').exists()).toBe(true)
  })

  it('should render generate button', () => {
    const wrapper = mount(UuidTool, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().includes('Generate')).length).toBe(1)
  })

  it('should render copy all button', () => {
    const wrapper = mount(UuidTool, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().includes('Copy')).length).toBe(1)
  })

  it('should render clear button', () => {
    const wrapper = mount(UuidTool, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().includes('Clear')).length).toBe(1)
  })

  it('should generate UUIDs on Generate click', async () => {
    const wrapper = mount(UuidTool, {
      global: { plugins: [router, i18n] },
    })
    const buttons = wrapper.findAll('button')
    const genButton = buttons.find(b => b.text().includes('Generate'))!
    await genButton.trigger('click')

    const output = wrapper.find('.code-content')
    expect(output.exists()).toBe(true)
    expect(output.text()).toContain('550e8400')
  })
})
