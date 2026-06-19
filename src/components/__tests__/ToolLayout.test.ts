import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ToolLayout from '../ToolLayout.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      common: {
        input: 'Input',
        output: 'Output',
      },
    },
  },
})

describe('ToolLayout', () => {
  it('should render title', () => {
    const wrapper = mount(ToolLayout, {
      props: { title: 'JSON Formatter' },
      global: {
        plugins: [i18n],
      },
    })
    expect(wrapper.text()).toContain('JSON Formatter')
  })

  it('should render input and output slots', () => {
    const wrapper = mount(ToolLayout, {
      props: { title: 'Test' },
      slots: {
        input: '<div class="input-slot">Input</div>',
        output: '<div class="output-slot">Output</div>',
      },
      global: {
        plugins: [i18n],
      },
    })
    expect(wrapper.find('.input-slot').exists()).toBe(true)
    expect(wrapper.find('.output-slot').exists()).toBe(true)
  })

  it('should render action buttons', () => {
    const wrapper = mount(ToolLayout, {
      props: { title: 'Test' },
      slots: {
        actions: '<button>Format</button>',
      },
      global: {
        plugins: [i18n],
      },
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('should apply responsive layout', () => {
    const wrapper = mount(ToolLayout, {
      props: { title: 'Test' },
      global: {
        plugins: [i18n],
      },
    })
    expect(wrapper.find('.tool-layout').exists()).toBe(true)
  })
})
