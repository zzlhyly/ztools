import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import M3u8Downloader from '../M3u8Downloader.vue'
import enUS from '@/i18n/en-US'
import { useM3u8Store } from '@/stores/m3u8'
import {
  parseCurlCommand,
  invokeFetchPage,
  invokeParseM3u8Urls,
  invokeParseM3u8,
  invokeStartDownload,
  invokeCancelDownload,
  invokeCheckFfmpeg,
  invokeMergeTs,
  invokeMergeTaskSegments,
  invokeGetDefaultDownloadDir,
  onDownloadProgress,
  onDownloadComplete,
  onDownloadError,
} from '@/utils/m3u8'
import { ElMessage, ElMessageBox, type MessageBoxData } from 'element-plus'
import { open } from '@tauri-apps/plugin-dialog'

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
  invokeStartDownload: vi.fn(),
  invokeCancelDownload: vi.fn(),
  invokeCheckFfmpeg: vi.fn(),
  invokeMergeTs: vi.fn(),
  invokeMergeTaskSegments: vi.fn(),
  invokeGetDefaultDownloadDir: vi.fn(),
  onDownloadProgress: vi.fn().mockResolvedValue(() => {}),
  onDownloadComplete: vi.fn().mockResolvedValue(() => {}),
  onDownloadError: vi.fn().mockResolvedValue(() => {}),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
    ElMessageBox: {
      confirm: vi.fn(),
    },
  }
})

interface M3u8Vm {
  handleMergeTaskSegments: (taskId: string) => Promise<void>
  handleMergeTs: () => Promise<void>
  handleRetryTask: (taskId: string) => Promise<void>
  handleCancelTask: (taskId: string) => Promise<void>
  handleDeleteTask: (taskId: string) => Promise<void>
  handleClearHistory: () => Promise<void>
  handleSelectQuality: (url: string, resolution: string) => Promise<void>
  handleSelectDownloadDir: () => Promise<void>
}

function mountTool() {
  return mount(M3u8Downloader, {
    global: { plugins: [router, i18n] },
  })
}

function asVm(wrapper: ReturnType<typeof mountTool>) {
  return wrapper.vm as unknown as M3u8Vm
}

describe('M3u8Downloader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    // 每个用例重置为默认实现，避免上一个用例的 mockResolvedValue 泄漏
    vi.mocked(parseCurlCommand).mockReset()
    vi.mocked(invokeFetchPage).mockReset()
    vi.mocked(invokeParseM3u8Urls).mockReset()
    vi.mocked(invokeParseM3u8).mockReset().mockResolvedValue({
      playlist_type: 'media',
      qualities: [],
      segment_count: 5,
      has_encryption: false,
    })
    vi.mocked(invokeStartDownload).mockReset().mockResolvedValue('/tmp/video.mp4')
    vi.mocked(invokeCancelDownload).mockReset().mockResolvedValue(undefined)
    vi.mocked(invokeCheckFfmpeg).mockReset().mockResolvedValue(true)
    vi.mocked(invokeMergeTs).mockReset().mockResolvedValue('/tmp/video.mp4')
    vi.mocked(invokeMergeTaskSegments).mockReset()
    vi.mocked(invokeGetDefaultDownloadDir).mockReset().mockResolvedValue('/tmp')
    vi.mocked(onDownloadProgress)
      .mockReset()
      .mockResolvedValue(() => {})
    vi.mocked(onDownloadComplete)
      .mockReset()
      .mockResolvedValue(() => {})
    vi.mocked(onDownloadError)
      .mockReset()
      .mockResolvedValue(() => {})
    vi.mocked(open).mockReset().mockResolvedValue(null)
    vi.mocked(ElMessageBox.confirm)
      .mockReset()
      .mockResolvedValue('confirm' as unknown as MessageBoxData)
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

  it('starts download for a direct m3u8 URL', async () => {
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper.find('.url-input input').setValue('https://example.com/video.m3u8')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()

    expect(store.tasks).toHaveLength(1)
    expect(store.tasks[0].status).toBe('downloading')
    expect(store.tasks[0].filename).toMatch(/\.mp4$/)
    expect(invokeStartDownload).toHaveBeenCalledTimes(1)
    const config = vi.mocked(invokeStartDownload).mock.calls[0][0]
    expect(config.m3u8_url).toBe('https://example.com/video.m3u8')
    expect(config.output_dir).toBe('/tmp')
  })

  it('passes configured headers to the download', async () => {
    const store = useM3u8Store()
    store.updateConfig({
      headers: {
        referer: 'https://ref.example.com/',
        cookie: 'session=abc',
        custom: [{ key: 'X-Token', value: 'tok' }],
      },
    })
    const wrapper = mountTool()
    await flushPromises()
    await wrapper.find('.url-input input').setValue('https://example.com/video.m3u8')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()

    const config = vi.mocked(invokeStartDownload).mock.calls[0][0]
    expect(config.headers).toEqual({
      Referer: 'https://ref.example.com/',
      Cookie: 'session=abc',
      'X-Token': 'tok',
    })
  })

  it('marks task as error when ffmpeg is missing', async () => {
    vi.mocked(invokeCheckFfmpeg).mockResolvedValue(false)
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper.find('.url-input input').setValue('https://example.com/video.m3u8')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()

    expect(store.tasks[0].status).toBe('error')
    expect(store.tasks[0].error).toBe(enUS.common.ffmpegNotFound)
    expect(invokeStartDownload).not.toHaveBeenCalled()
  })

  it('marks task as error when start_download fails', async () => {
    vi.mocked(invokeStartDownload).mockRejectedValue('[DOWNLOAD_ERROR] disk full')
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper.find('.url-input input').setValue('https://example.com/video.m3u8')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()

    expect(store.tasks[0].status).toBe('error')
    expect(store.tasks[0].error).toContain('disk full')
    expect(ElMessage.error).toHaveBeenCalled()
  })

  it('opens quality dialog for master playlist and starts on selection', async () => {
    vi.mocked(invokeParseM3u8).mockResolvedValue({
      playlist_type: 'master',
      qualities: [
        { bandwidth: 2000000, resolution: '1280x720', url: 'https://example.com/720p.m3u8' },
        { bandwidth: 1000000, resolution: '854x480', url: 'https://example.com/480p.m3u8' },
      ],
      segment_count: 0,
      has_encryption: false,
    })
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper.find('.url-input input').setValue('https://example.com/master.m3u8')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()

    expect(store.tasks[0].status).toBe('selecting_quality')
    expect(invokeStartDownload).not.toHaveBeenCalled()

    await asVm(wrapper).handleSelectQuality('https://example.com/720p.m3u8', '1280x720')
    await flushPromises()

    expect(store.tasks[0].status).toBe('downloading')
    expect(store.tasks[0].quality).toBe('1280x720')
    expect(vi.mocked(invokeStartDownload).mock.calls[0][0].m3u8_url).toBe(
      'https://example.com/720p.m3u8',
    )
  })

  it('cancels task when quality dialog is closed without selection', async () => {
    vi.mocked(invokeParseM3u8).mockResolvedValue({
      playlist_type: 'master',
      qualities: [
        { bandwidth: 2000000, resolution: '1280x720', url: 'https://example.com/720p.m3u8' },
        { bandwidth: 1000000, resolution: '854x480', url: 'https://example.com/480p.m3u8' },
      ],
      segment_count: 0,
      has_encryption: false,
    })
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper.find('.url-input input').setValue('https://example.com/master.m3u8')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()
    expect(store.tasks[0].status).toBe('selecting_quality')
    expect(invokeStartDownload).not.toHaveBeenCalled()

    // 模拟用户未选择清晰度直接关闭弹框
    const dialog = wrapper.findComponent({ name: 'ElDialog' })
    expect(dialog.exists()).toBe(true)
    await dialog.vm.$emit('update:modelValue', false)
    await dialog.vm.$emit('close')
    await flushPromises()
    expect(store.tasks[0].status).toBe('cancelled')
  })

  it('marks task as error when webpage has no m3u8', async () => {
    vi.mocked(invokeFetchPage).mockResolvedValue({
      html: '<html></html>',
      final_url: 'https://example.com/watch/1',
    })
    vi.mocked(invokeParseM3u8Urls).mockResolvedValue([])
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper.find('.url-input input').setValue('https://example.com/watch/1')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()

    expect(invokeFetchPage).toHaveBeenCalledTimes(1)
    expect(store.tasks[0].status).toBe('error')
    expect(store.tasks[0].error).toBe(enUS.common.noM3u8Found)
  })

  it('starts download from a webpage with a single media playlist', async () => {
    vi.mocked(invokeFetchPage).mockResolvedValue({
      html: '<html></html>',
      final_url: 'https://example.com/watch/1',
    })
    vi.mocked(invokeParseM3u8Urls).mockResolvedValue([
      { url: 'https://example.com/v.m3u8', label: 'video' },
    ])
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper.find('.url-input input').setValue('https://example.com/watch/1')
    await wrapper.find('.url-input input').trigger('keydown.enter')
    await flushPromises()

    expect(store.tasks[0].status).toBe('downloading')
    expect(vi.mocked(invokeStartDownload).mock.calls[0][0].m3u8_url).toBe(
      'https://example.com/v.m3u8',
    )
  })

  it('ignores progress and complete events for cancelled tasks', async () => {
    mountTool()
    await flushPromises()
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'cancelled' })

    const progressCb = vi.mocked(onDownloadProgress).mock.calls[0][0]
    progressCb({ task_id: task.id, percent: 50, speed: '1 MB/s', downloaded: 5, total: 10 })
    expect(store.tasks[0].status).toBe('cancelled')

    const completeCb = vi.mocked(onDownloadComplete).mock.calls[0][0]
    completeCb({ task_id: task.id, output_path: '/tmp/x.mp4' })
    expect(store.tasks[0].status).toBe('cancelled')

    const errorCb = vi.mocked(onDownloadError).mock.calls[0][0]
    errorCb({ task_id: task.id, error: 'boom' })
    expect(store.tasks[0].status).toBe('cancelled')
  })

  it('updates task from progress and complete events', async () => {
    mountTool()
    await flushPromises()
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'downloading' })

    const progressCb = vi.mocked(onDownloadProgress).mock.calls[0][0]
    progressCb({ task_id: task.id, percent: 42, speed: '1 MB/s', downloaded: 420, total: 1000 })
    expect(store.tasks[0].progress).toBe(42)
    expect(store.tasks[0].downloaded).toBe(420)

    const completeCb = vi.mocked(onDownloadComplete).mock.calls[0][0]
    completeCb({ task_id: task.id, output_path: '/tmp/video.mp4' })
    expect(store.tasks[0].status).toBe('done')
    expect(store.tasks[0].outputPath).toBe('/tmp/video.mp4')
  })

  it('marks task as error from error event', async () => {
    mountTool()
    await flushPromises()
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'downloading' })

    const errorCb = vi.mocked(onDownloadError).mock.calls[0][0]
    errorCb({ task_id: task.id, error: 'network reset' })
    expect(store.tasks[0].status).toBe('error')
    expect(store.tasks[0].error).toBe('network reset')
    expect(ElMessage.error).toHaveBeenCalledWith('network reset')
  })

  it('merges task segments and marks task as done', async () => {
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'error', filename: 'video.mp4' })
    store.updateConfig({ downloadDir: '/tmp', ffmpegPath: 'ffmpeg' })
    vi.mocked(invokeMergeTaskSegments).mockResolvedValue('/tmp/video.mp4')

    const wrapper = mountTool()
    await flushPromises()
    await asVm(wrapper).handleMergeTaskSegments(task.id)
    await flushPromises()

    expect(invokeMergeTaskSegments).toHaveBeenCalledWith(task.id, 'ffmpeg', '/tmp', 'video.mp4')
    expect(store.tasks[0].status).toBe('done')
    expect(store.tasks[0].outputPath).toBe('/tmp/video.mp4')
    expect(store.tasks[0].error).toBeUndefined()
  })

  it('does not merge task segments when ffmpeg is missing', async () => {
    vi.mocked(invokeCheckFfmpeg).mockResolvedValue(false)
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'error', filename: 'video.mp4' })

    const wrapper = mountTool()
    await flushPromises()
    await asVm(wrapper).handleMergeTaskSegments(task.id)
    await flushPromises()

    expect(invokeMergeTaskSegments).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith(enUS.common.ffmpegNotFound)
  })

  it('shows merge button on error task cards', () => {
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'error', filename: 'video.mp4' })

    const wrapper = mountTool()
    const actions = wrapper.find('.task-actions')
    expect(actions.exists()).toBe(true)
    // merge + retry + delete
    expect(actions.findAll('button')).toHaveLength(3)
  })

  it('cancels a task after confirmation', async () => {
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'downloading' })

    const wrapper = mountTool()
    await flushPromises()
    await asVm(wrapper).handleCancelTask(task.id)
    await flushPromises()

    expect(invokeCancelDownload).toHaveBeenCalledWith(task.id)
    expect(store.tasks[0].status).toBe('cancelled')
  })

  it('keeps task running when cancel is dismissed', async () => {
    vi.mocked(ElMessageBox.confirm).mockRejectedValue('cancel')
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'downloading' })

    const wrapper = mountTool()
    await flushPromises()
    await asVm(wrapper).handleCancelTask(task.id)
    await flushPromises()

    expect(invokeCancelDownload).not.toHaveBeenCalled()
    expect(store.tasks[0].status).toBe('downloading')
  })

  it('deletes a downloading task after stopping backend download', async () => {
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'downloading' })

    const wrapper = mountTool()
    await flushPromises()
    await asVm(wrapper).handleDeleteTask(task.id)
    await flushPromises()

    expect(invokeCancelDownload).toHaveBeenCalledWith(task.id)
    expect(store.tasks).toHaveLength(0)
  })

  it('retries a cancelled task and restarts the download', async () => {
    const store = useM3u8Store()
    const task = store.addTask('https://example.com/v.m3u8', 'direct')
    store.updateTask(task.id, { status: 'cancelled', m3u8Url: 'https://example.com/v.m3u8' })

    const wrapper = mountTool()
    await flushPromises()
    await asVm(wrapper).handleRetryTask(task.id)
    await flushPromises()

    expect(store.tasks[0].status).toBe('downloading')
    expect(invokeStartDownload).toHaveBeenCalledTimes(1)
  })

  it('clears completed tasks but keeps active ones', async () => {
    const store = useM3u8Store()
    const doneTask = store.addTask('https://example.com/a.m3u8', 'direct')
    store.updateTask(doneTask.id, { status: 'error' })
    store.addTask('https://example.com/b.m3u8', 'direct')

    const wrapper = mountTool()
    await flushPromises()
    await asVm(wrapper).handleClearHistory()
    await flushPromises()

    expect(store.tasks).toHaveLength(1)
  })

  it('extracts URL and headers from a pasted cURL command', async () => {
    vi.mocked(parseCurlCommand).mockReturnValue({
      url: 'https://example.com/video.m3u8',
      headers: { Referer: 'https://example.com/' },
    })
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes(enUS.common.curlPaste))!
      .trigger('click')
    await wrapper.find('.curl-section textarea').setValue(`curl 'https://example.com/video.m3u8'`)
    await wrapper.find('.curl-section button').trigger('click')
    await flushPromises()

    expect(store.config.headers.referer).toBe('https://example.com/')
    expect((wrapper.find('.url-input input').element as HTMLInputElement).value).toBe(
      'https://example.com/video.m3u8',
    )
  })

  it('shows an error for an invalid cURL command', async () => {
    const wrapper = mountTool()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes(enUS.common.curlPaste))!
      .trigger('click')
    await wrapper.find('.curl-section textarea').setValue('not a curl command')
    await wrapper.find('.curl-section button').trigger('click')
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalled()
  })

  it('merges a manually selected TS directory', async () => {
    vi.mocked(open).mockResolvedValue('/tmp/segs')
    const wrapper = mountTool()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes(enUS.common.mergeTs))!
      .trigger('click')
    await flushPromises()

    expect(invokeMergeTs).toHaveBeenCalledWith('/tmp/segs', 'ffmpeg')
    expect(ElMessage.success).toHaveBeenCalled()
  })

  it('updates download directory from the folder picker', async () => {
    vi.mocked(open).mockResolvedValue('/new/dir')
    const wrapper = mountTool()
    await flushPromises()
    const store = useM3u8Store()

    await asVm(wrapper).handleSelectDownloadDir()
    await flushPromises()

    expect(store.config.downloadDir).toBe('/new/dir')
  })
})
