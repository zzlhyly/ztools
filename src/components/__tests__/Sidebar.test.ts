import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import Sidebar from '../Sidebar.vue'

// Mock matchMedia (required by app store)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/json' },
    { path: '/json', component: { template: '<div>JSON</div>' } },
    { path: '/xml', component: { template: '<div>XML</div>' } },
  ],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        json: { name: 'JSON' },
        xml: { name: 'XML' },
        base64: { name: 'Base64' },
        url: { name: 'URL' },
        timestamp: { name: 'Timestamp' },
        regex: { name: 'Regex' },
        color: { name: 'Color' },
        hash: { name: 'Hash' },
      },
    },
  },
})

describe('Sidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should render tool list', () => {
    const wrapper = mount(Sidebar, {
      global: {
        plugins: [router, i18n],
      },
    })
    const menuItems = wrapper.findAll('.menu-item')
    expect(menuItems.length).toBeGreaterThan(0)
  })

  it('should highlight current route', async () => {
    await router.push('/json')
    const wrapper = mount(Sidebar, {
      global: {
        plugins: [router, i18n],
      },
    })
    const activeItem = wrapper.find('.menu-item.active')
    expect(activeItem.exists()).toBe(true)
  })

  it('should toggle collapse', async () => {
    const wrapper = mount(Sidebar, {
      global: {
        plugins: [router, i18n],
      },
    })
    const toggleButton = wrapper.find('.toggle-button')
    await toggleButton.trigger('click')
    expect(wrapper.find('.sidebar').classes()).toContain('collapsed')
  })
})
