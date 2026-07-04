import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolPanel from '../ToolPanel.vue'

describe('ToolPanel', () => {
  it('renders title and default slot', () => {
    const wrapper = mount(ToolPanel, {
      props: { title: 'Input' },
      slots: { default: '<textarea>hello</textarea>' },
      global: {
        mocks: { $t: (key: string) => key },
      },
    })

    expect(wrapper.text()).toContain('Input')
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('shows copy button when copyable', () => {
    const wrapper = mount(ToolPanel, {
      props: { title: 'Output', copyable: true },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('emits copy event when copy button clicked', async () => {
    const wrapper = mount(ToolPanel, {
      props: { title: 'Output', copyable: true },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('copy')).toHaveLength(1)
  })
})
