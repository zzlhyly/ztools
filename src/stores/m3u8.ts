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
