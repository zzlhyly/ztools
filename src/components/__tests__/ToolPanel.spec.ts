import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolPanel from '../ToolPanel.vue'

describe('ToolPanel', () => {
  it('renders title and default slot', () => {
    const wrapper = mount(ToolPanel, {
      props: { title: 'Input' },
      slots: { default: '<textarea>hello</textarea>' },
      global: {
        mocks: { $t: (key: string) => key },
        stubs: { 'el-button': { template: '<button><slot /></button>' } },
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
        stubs: { 'el-button': { template: '<button><slot /></button>' } },
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
        stubs: { 'el-button': { template: '<button><slot /></button>' } },
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('copy')).toHaveLength(1)
  })
})
