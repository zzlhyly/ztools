import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import M3u8Downloader from '../M3u8Downloader.vue'
import enUS from '@/i18n/en-US'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/m3u8', component: M3u8Downloader }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: { 'en-US': enUS },
})

vi.mock('@/utils/m3u8', () => ({
  parseCurlCommand: vi.fn(),
  invokeFetchPage: vi.fn(),
  invokeParseM3u8Urls: vi.fn(),
  invokeParseM3u8: vi.fn(),
  invokeStartDownload: vi.fn().mockResolvedValue(undefined),
  invokeCancelDownload: vi.fn().mockResolvedValue(undefined),
  invokeCheckFfmpeg: vi.fn().mockResolvedValue(true),
  invokeMergeTs: vi.fn().mockResolvedValue('/tmp/video.mp4'),
  invokeGetDefaultDownloadDir: vi.fn().mockResolvedValue('/tmp'),
  onDownloadProgress: vi.fn().mockResolvedValue(() => {}),
  onDownloadComplete: vi.fn().mockResolvedValue(() => {}),
  onDownloadError: vi.fn().mockResolvedValue(() => {}),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue(null),
}))

function mountTool() {
  return mount(M3u8Downloader, {
    global: { plugins: [router, i18n] },
  })
}

describe('M3u8Downloader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should render title and url input', () => {
    const wrapper = mountTool()
    expect(wrapper.find('.tool-title').exists()).toBe(true)
    expect(wrapper.find('.url-input input').exists()).toBe(true)
  })

  it('should have add task and merge ts buttons', () => {
    const wrapper = mountTool()
    const buttons = wrapper.findAll('button')
    expect(buttons.filter((b) => b.text().includes('Add Task')).length).toBe(1)
    expect(buttons.filter((b) => b.text().includes('Merge TS Files')).length).toBe(1)
  })

  it('should show config fields for download dir and ffmpeg path', () => {
    const wrapper = mountTool()
    const labels = wrapper.findAll('label')
    expect(labels.filter((l) => l.text().includes('Download Directory')).length).toBe(1)
    expect(labels.filter((l) => l.text().includes('FFmpeg Path')).length).toBe(1)
  })

  it('should show empty state when there are no tasks', () => {
    const wrapper = mountTool()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })
})
