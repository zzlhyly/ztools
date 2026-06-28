import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useM3u8Store } from '../m3u8'
import type { M3u8Task } from '../m3u8'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('M3U8 Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Config', () => {
    it('should have default config values', () => {
      const store = useM3u8Store()
      expect(store.config.downloadDir).toBe('')
      expect(store.config.ffmpegPath).toBe('ffmpeg')
      expect(store.config.maxTaskConcurrent).toBe(1)
      expect(store.config.maxSegmentConcurrent).toBe(5)
      expect(store.config.headers.referer).toBe('')
      expect(store.config.headers.cookie).toBe('')
      expect(store.config.headers.custom).toEqual([])
    })

    it('should update config and persist to localStorage', () => {
      const store = useM3u8Store()
      store.updateConfig({ downloadDir: '/downloads' })
      expect(store.config.downloadDir).toBe('/downloads')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should load config from localStorage on init', () => {
      localStorageMock.getItem.mockReturnValueOnce(
        JSON.stringify({ downloadDir: '/custom', ffmpegPath: '/usr/bin/ffmpeg' })
      )
      const store = useM3u8Store()
      expect(store.config.downloadDir).toBe('/custom')
      expect(store.config.ffmpegPath).toBe('/usr/bin/ffmpeg')
    })
  })

  describe('Tasks', () => {
    it('should add a task and return it', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      expect(task.id).toBeTruthy()
      expect(task.url).toBe('https://example.com/video')
      expect(task.status).toBe('parsing')
      expect(store.tasks).toHaveLength(1)
    })

    it('should update a task status and progress', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, {
        status: 'downloading',
        progress: 50,
        speed: '2.0 MB/s',
        downloaded: 100,
        total: 200,
      })
      const updated = store.tasks.find(t => t.id === task.id)!
      expect(updated.status).toBe('downloading')
      expect(updated.progress).toBe(50)
      expect(updated.speed).toBe('2.0 MB/s')
      expect(updated.downloaded).toBe(100)
      expect(updated.total).toBe(200)
    })

    it('should remove a task', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      expect(store.tasks).toHaveLength(1)
      store.removeTask(task.id)
      expect(store.tasks).toHaveLength(0)
    })

    it('should mark task as cancelled', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, { status: 'downloading' })
      store.cancelTask(task.id)
      const cancelled = store.tasks.find(t => t.id === task.id)!
      expect(cancelled.status).toBe('cancelled')
    })

    it('should mark task as done with completedAt', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, {
        status: 'done',
        progress: 100,
        completedAt: Date.now(),
      })
      const done = store.tasks.find(t => t.id === task.id)!
      expect(done.status).toBe('done')
      expect(done.completedAt).toBeGreaterThan(0)
    })

    it('should persist tasks to localStorage', () => {
      const store = useM3u8Store()
      store.addTask('https://example.com/video', 'direct')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'm3u8_tasks',
        expect.any(String)
      )
    })

    it('should persist task history (keep completed tasks)', () => {
      const store = useM3u8Store()
      const task1 = store.addTask('https://a.com/v1', 'direct')
      const task2 = store.addTask('https://a.com/v2', 'webpage')
      store.updateTask(task1.id, { status: 'done', progress: 100, completedAt: Date.now() })
      store.updateTask(task2.id, { status: 'done', progress: 100, completedAt: Date.now() })
      expect(store.tasks).toHaveLength(2)
    })

    it('should have active downloading tasks count', () => {
      const store = useM3u8Store()
      const task = store.addTask('https://example.com/video', 'direct')
      store.updateTask(task.id, { status: 'downloading' })
      const active = store.tasks.filter(
        t => t.status === 'downloading' || t.status === 'converting'
      )
      expect(active).toHaveLength(1)
    })
  })
})
