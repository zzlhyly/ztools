import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DownloadProgress from '../DownloadProgress.vue'

describe('DownloadProgress', () => {
  it('should render progress bar with percentage', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 45,
        speed: '2.0 MB/s',
        downloaded: 90,
        total: 200,
        status: 'downloading',
      },
    })
    expect(wrapper.text()).toContain('45')
    expect(wrapper.text()).toContain('2.0 MB/s')
  })

  it('should show 0% for zero progress', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 0,
        speed: '',
        downloaded: 0,
        total: 100,
        status: 'parsing',
      },
    })
    expect(wrapper.text()).toContain('0')
  })

  it('should show 100% for complete', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 100,
        speed: '',
        downloaded: 100,
        total: 100,
        status: 'done',
      },
    })
    expect(wrapper.text()).toContain('100')
  })

  it('should show "—" speed when empty', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 10,
        speed: '',
        downloaded: 10,
        total: 100,
        status: 'downloading',
      },
    })
    expect(wrapper.text()).toContain('—')
  })

  it('should render progress bar when status is error', () => {
    const wrapper = mount(DownloadProgress, {
      props: {
        progress: 30,
        speed: '',
        downloaded: 30,
        total: 100,
        status: 'error',
      },
    })
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(true)
  })
})
