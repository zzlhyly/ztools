import { invoke } from '@tauri-apps/api/core'
import { TauriError } from '@/utils/errors'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { ProgressEvent, M3u8QualityOption } from '@/stores/m3u8'

/**
 * Parse a cURL command string into URL and headers.
 * Returns null if the input is not a cURL command.
 */
export function parseCurlCommand(
  curlString: string,
): { url: string; headers: Record<string, string> } | null {
  const trimmed = curlString.trim()
  if (!trimmed.startsWith('curl ')) return null

  // Extract URL — matches the first unquoted, single-quoted, or double-quoted URL after "curl "
  const urlMatch = trimmed.match(
    /curl\s+(?:--\S+\s+)*(?:'([^']+)'|"([^"]+)"|(\S+))/,
  )
  if (!urlMatch) return null
  const url = urlMatch[1] || urlMatch[2] || urlMatch[3]
  if (!url || !url.startsWith('http')) return null

  // Extract headers (-H 'Key: Value' or --header 'Key: Value')
  const headers: Record<string, string> = {}
  const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)")/g
  let match: RegExpExecArray | null
  while ((match = headerRegex.exec(trimmed)) !== null) {
    const headerStr = match[1] || match[2]
    const colonIndex = headerStr.indexOf(':')
    if (colonIndex > 0) {
      const key = headerStr.substring(0, colonIndex).trim()
      const value = headerStr.substring(colonIndex + 1).trim()
      headers[key] = value
    }
  }

  return { url, headers }
}

// ---- Tauri command wrappers ----

export interface FetchPageResult {
  html: string
  final_url: string
}

export async function invokeFetchPage(
  url: string,
  headers: Record<string, string>,
): Promise<FetchPageResult> {
  try {
    return await invoke<FetchPageResult>('fetch_page', { url, headers })
  } catch (e) {
    throw new TauriError(String(e), 'NETWORK_ERROR')
  }
}

export interface M3u8Info {
  url: string
  label: string
  qualities: M3u8QualityOption[]
}

export async function invokeParseM3u8Urls(
  html: string,
  baseUrl: string,
): Promise<M3u8Info[]> {
  try {
    return await invoke<M3u8Info[]>('parse_m3u8_urls', { html, baseUrl })
  } catch (e) {
    throw new TauriError(String(e), 'PARSE_ERROR')
  }
}

export interface ParseM3u8Result {
  playlist_type: 'master' | 'media'
  qualities: M3u8QualityOption[]
  segment_count: number
  has_encryption: boolean
}

export async function invokeParseM3u8(
  url: string,
  headers: Record<string, string>,
): Promise<ParseM3u8Result> {
  try {
    return await invoke<ParseM3u8Result>('parse_m3u8', { url, headers })
  } catch (e) {
    throw new TauriError(String(e), 'PARSE_ERROR')
  }
}

export interface DownloadConfig {
  task_id: string
  m3u8_url: string
  output_dir: string
  filename: string
  headers: Record<string, string>
  ffmpeg_path: string
  max_segment_concurrent: number
}

export async function invokeStartDownload(config: DownloadConfig): Promise<string> {
  try {
    return await invoke<string>('start_download', { config })
  } catch (e) {
    throw new TauriError(String(e), 'DOWNLOAD_ERROR')
  }
}

export async function invokeCancelDownload(taskId: string): Promise<void> {
  try {
    return await invoke('cancel_download', { taskId })
  } catch (e) {
    throw new TauriError(String(e), 'DOWNLOAD_ERROR')
  }
}

export async function invokeCheckFfmpeg(ffmpegPath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('check_ffmpeg', { ffmpegPath })
  } catch (e) {
    throw new TauriError(String(e), 'UNKNOWN')
  }
}

// ---- Event listeners ----

export async function onDownloadProgress(
  callback: (event: ProgressEvent) => void,
): Promise<UnlistenFn> {
  return listen<ProgressEvent>('download-progress', (event) => {
    callback(event.payload)
  })
}

export interface DownloadCompleteEvent {
  task_id: string
  output_path: string
}

export async function onDownloadComplete(
  callback: (event: DownloadCompleteEvent) => void,
): Promise<UnlistenFn> {
  return listen<DownloadCompleteEvent>('download-complete', (event) => {
    callback(event.payload)
  })
}

export interface DownloadErrorEvent {
  task_id: string
  error: string
}

export async function onDownloadError(
  callback: (event: DownloadErrorEvent) => void,
): Promise<UnlistenFn> {
  return listen<DownloadErrorEvent>('download-error', (event) => {
    callback(event.payload)
  })
}

export async function invokeGetDefaultDownloadDir(): Promise<string> {
  try {
    return await invoke<string>('get_default_download_dir')
  } catch (e) {
    throw new TauriError(String(e), 'UNKNOWN')
  }
}
