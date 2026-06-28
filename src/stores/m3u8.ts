import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// Type definitions for M3U8 downloader

export type M3u8InputMode = 'webpage' | 'direct'

export type M3u8TaskStatus =
  | 'parsing'
  | 'selecting_quality'
  | 'downloading'
  | 'converting'
  | 'done'
  | 'error'
  | 'cancelled'

export interface M3u8QualityOption {
  bandwidth: number
  resolution: string
  url: string
}

export interface M3u8Task {
  id: string
  url: string
  inputMode: M3u8InputMode
  m3u8Url: string
  title: string
  quality: string
  filename: string
  status: M3u8TaskStatus
  progress: number
  speed: string
  downloaded: number
  total: number
  error?: string
  createdAt: number
  completedAt?: number
  qualityOptions?: M3u8QualityOption[]
}

export interface M3u8Config {
  downloadDir: string
  ffmpegPath: string
  headers: {
    referer: string
    cookie: string
    custom: Array<{ key: string; value: string }>
  }
  maxTaskConcurrent: number
  maxSegmentConcurrent: number
}

export interface ProgressEvent {
  task_id: string
  percent: number
  speed: string
  downloaded: number
  total: number
}

function defaultConfig(): M3u8Config {
  return {
    downloadDir: '',
    ffmpegPath: 'ffmpeg',
    headers: {
      referer: '',
      cookie: '',
      custom: [],
    },
    maxTaskConcurrent: 1,
    maxSegmentConcurrent: 5,
  }
}

function loadConfig(): M3u8Config {
  try {
    const raw = localStorage.getItem('m3u8_config')
    if (raw) {
      return { ...defaultConfig(), ...JSON.parse(raw) }
    }
  } catch { /* ignore parse errors */ }
  return defaultConfig()
}

function loadTasks(): M3u8Task[] {
  try {
    const raw = localStorage.getItem('m3u8_tasks')
    if (raw) {
      return JSON.parse(raw)
    }
  } catch { /* ignore parse errors */ }
  return []
}

let taskIdCounter = 0

function generateId(): string {
  taskIdCounter++
  return `m3u8_${Date.now()}_${taskIdCounter}`
}

export const useM3u8Store = defineStore('m3u8', () => {
  const config = ref<M3u8Config>(loadConfig())
  const tasks = ref<M3u8Task[]>(loadTasks())

  // Persist tasks on every change
  watch(tasks, (val) => {
    localStorage.setItem('m3u8_tasks', JSON.stringify(val))
  }, { deep: true, flush: 'sync' })

  // Persist config on every change
  watch(config, (val) => {
    localStorage.setItem('m3u8_config', JSON.stringify(val))
  }, { deep: true, flush: 'sync' })

  function updateConfig(partial: Partial<M3u8Config>) {
    config.value = { ...config.value, ...partial }
  }

  function addTask(url: string, inputMode: M3u8InputMode): M3u8Task {
    const task: M3u8Task = {
      id: generateId(),
      url,
      inputMode,
      m3u8Url: '',
      title: '',
      quality: 'auto',
      filename: '',
      status: 'parsing',
      progress: 0,
      speed: '',
      downloaded: 0,
      total: 0,
      createdAt: Date.now(),
    }
    tasks.value.push(task)
    return task
  }

  function updateTask(taskId: string, patch: Partial<M3u8Task>) {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...patch }
    }
  }

  function removeTask(taskId: string) {
    tasks.value = tasks.value.filter(t => t.id !== taskId)
  }

  function cancelTask(taskId: string) {
    updateTask(taskId, { status: 'cancelled' })
  }

  function retryTask(taskId: string) {
    updateTask(taskId, {
      status: 'parsing',
      progress: 0,
      speed: '',
      error: undefined,
    })
  }

  return {
    config,
    tasks,
    updateConfig,
    addTask,
    updateTask,
    removeTask,
    cancelTask,
    retryTask,
  }
})
