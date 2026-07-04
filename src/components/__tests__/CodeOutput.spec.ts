import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeOutput from '../CodeOutput.vue'

describe('CodeOutput', () => {
  it('renders empty state when no content', () => {
    const wrapper = mount(CodeOutput, {
      props: { content: '' },
      global: {
        mocks: { $t: (key: string) => key },
      },
    })

    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('renders content', () => {
    const wrapper = mount(CodeOutput, {
      props: { content: '{"a":1}', language: 'json' },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.find('.code-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('"a"')
  })

  it('shows error alert', () => {
    const wrapper = mount(CodeOutput, {
      props: { content: '', error: 'Invalid JSON' },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    expect(wrapper.find('.el-alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('Invalid JSON')
  })
})
