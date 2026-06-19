import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TitleBar from '../TitleBar.vue'

// Mock window functions
vi.mock('@/utils/window', () => ({
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
}))

describe('TitleBar', () => {
  it('should render title', () => {
    const wrapper = mount(TitleBar, {
      props: { title: 'ztools' },
    })
    expect(wrapper.text()).toContain('ztools')
  })

  it('should render window controls on Windows', () => {
    const wrapper = mount(TitleBar, {
      props: { title: 'ztools' },
    })
    const buttons = wrapper.findAll('.titlebar-button')
    expect(buttons).toHaveLength(3) // minimize, maximize, close
  })

  it('should have drag region', () => {
    const wrapper = mount(TitleBar, {
      props: { title: 'ztools' },
    })
    expect(wrapper.find('[data-tauri-drag-region]').exists()).toBe(true)
  })
})
