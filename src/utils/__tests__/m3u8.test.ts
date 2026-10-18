import { describe, it, expect, vi, beforeEach } from 'vitest'
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
} from '../m3u8'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))

describe('parseCurlCommand', () => {
  it('should extract URL from a simple curl command', () => {
    const result = parseCurlCommand(`curl 'https://example.com/video.m3u8'`)
    expect(result).not.toBeNull()
    expect(result!.url).toBe('https://example.com/video.m3u8')
    expect(result!.headers).toEqual({})
  })

  it('should extract URL with double quotes', () => {
    const result = parseCurlCommand(`curl "https://example.com/video.m3u8"`)
    expect(result!.url).toBe('https://example.com/video.m3u8')
  })

  it('should extract URL without quotes', () => {
    const result = parseCurlCommand(`curl https://example.com/video.m3u8`)
    expect(result!.url).toBe('https://example.com/video.m3u8')
  })

  it('should extract -H headers', () => {
    const curl = [
      `curl 'https://example.com/video.m3u8'`,
      `-H 'Referer: https://example.com/'`,
      `-H 'Cookie: session=abc123'`,
    ].join(' \\\n')
    const result = parseCurlCommand(curl)
    expect(result).not.toBeNull()
    expect(result!.headers).toEqual({
      Referer: 'https://example.com/',
      Cookie: 'session=abc123',
    })
  })

  it('should extract --header headers', () => {
    const curl = [
      `curl "https://example.com/video.m3u8"`,
      `--header "User-Agent: Mozilla/5.0"`,
    ].join(' \\\n')
    const result = parseCurlCommand(curl)
    expect(result!.headers).toEqual({
      'User-Agent': 'Mozilla/5.0',
    })
  })

  it('should return null for non-curl input', () => {
    const result = parseCurlCommand('just a regular URL')
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = parseCurlCommand('')
    expect(result).toBeNull()
  })

  it('should handle mixed quote styles', () => {
    const curl = [
      `curl 'https://example.com/video.m3u8'`,
      `-H "Referer: https://example.com/"`,
      `-H 'Cookie: session=abc'`,
    ].join(' \\\n')
    const result = parseCurlCommand(curl)
    expect(result!.url).toBe('https://example.com/video.m3u8')
    expect(result!.headers).toEqual({
      Referer: 'https://example.com/',
      Cookie: 'session=abc',
    })
  })

  it('should handle multiline curl without backslashes', () => {
    const curl = `curl 'https://example.com/video.m3u8' -H 'Referer: https://example.com/' -H 'Cookie: x=1'`
    const result = parseCurlCommand(curl)
    expect(result!.headers).toEqual({
      Referer: 'https://example.com/',
      Cookie: 'x=1',
    })
  })
})

describe('Tauri command wrappers', () => {
  const mockInvoke = vi.mocked(invoke)

  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('invokeFetchPage passes url and headers', async () => {
    mockInvoke.mockResolvedValue({ html: '<html/>', final_url: 'https://a/' })
    const result = await invokeFetchPage('https://a/', { Referer: 'https://a/' })
    expect(mockInvoke).toHaveBeenCalledWith('fetch_page', {
      url: 'https://a/',
      headers: { Referer: 'https://a/' },
    })
    expect(result.html).toBe('<html/>')
    expect(result.final_url).toBe('https://a/')
  })

  it('invokeFetchPage throws NETWORK_ERROR by default', async () => {
    mockInvoke.mockRejectedValue('refused')
    await expect(invokeFetchPage('https://a/', {})).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'refused',
    })
  })

  it('invokeFetchPage extracts bracketed code from Rust error', async () => {
    mockInvoke.mockRejectedValue('[PERMISSION_DENIED] denied')
    await expect(invokeFetchPage('https://a/', {})).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      message: 'denied',
    })
  })

  it('invokeParseM3u8Urls calls parse_m3u8_urls', async () => {
    mockInvoke.mockResolvedValue([])
    const result = await invokeParseM3u8Urls('<html/>', 'https://a/')
    expect(mockInvoke).toHaveBeenCalledWith('parse_m3u8_urls', {
      html: '<html/>',
      baseUrl: 'https://a/',
    })
    expect(result).toEqual([])
  })

  it('invokeParseM3u8Urls throws PARSE_ERROR', async () => {
    mockInvoke.mockRejectedValue('bad html')
    await expect(invokeParseM3u8Urls('<x>', 'https://a/')).rejects.toMatchObject({
      code: 'PARSE_ERROR',
    })
  })

  it('invokeParseM3u8 returns playlist info', async () => {
    mockInvoke.mockResolvedValue({
      playlist_type: 'media',
      qualities: [],
      segment_count: 3,
      has_encryption: true,
    })
    const result = await invokeParseM3u8('https://a/v.m3u8', {})
    expect(mockInvoke).toHaveBeenCalledWith('parse_m3u8', {
      url: 'https://a/v.m3u8',
      headers: {},
    })
    expect(result.segment_count).toBe(3)
    expect(result.has_encryption).toBe(true)
  })

  it('invokeParseM3u8 throws PARSE_ERROR', async () => {
    mockInvoke.mockRejectedValue('404')
    await expect(invokeParseM3u8('https://a/v.m3u8', {})).rejects.toMatchObject({
      code: 'PARSE_ERROR',
    })
  })

  it('invokeStartDownload wraps config and returns path', async () => {
    mockInvoke.mockResolvedValue('/tmp/video.mp4')
    const config = {
      task_id: 't1',
      m3u8_url: 'https://a/v.m3u8',
      output_dir: '/tmp',
      filename: 'video.mp4',
      headers: {},
      ffmpeg_path: 'ffmpeg',
      max_segment_concurrent: 8,
    }
    const result = await invokeStartDownload(config)
    expect(mockInvoke).toHaveBeenCalledWith('start_download', { config })
    expect(result).toBe('/tmp/video.mp4')
  })

  it('invokeStartDownload throws DOWNLOAD_ERROR', async () => {
    mockInvoke.mockRejectedValue('disk full')
    await expect(
      invokeStartDownload({
        task_id: 't1',
        m3u8_url: 'https://a/v.m3u8',
        output_dir: '/tmp',
        filename: 'video.mp4',
        headers: {},
        ffmpeg_path: 'ffmpeg',
        max_segment_concurrent: 8,
      }),
    ).rejects.toMatchObject({ code: 'DOWNLOAD_ERROR' })
  })

  it('invokeCancelDownload calls cancel_download', async () => {
    mockInvoke.mockResolvedValue(undefined)
    await invokeCancelDownload('t1')
    expect(mockInvoke).toHaveBeenCalledWith('cancel_download', { taskId: 't1' })
  })

  it('invokeCheckFfmpeg returns boolean and defaults code to UNKNOWN', async () => {
    mockInvoke.mockResolvedValue(true)
    await expect(invokeCheckFfmpeg('ffmpeg')).resolves.toBe(true)
    mockInvoke.mockRejectedValue('missing')
    await expect(invokeCheckFfmpeg('missing')).rejects.toMatchObject({ code: 'UNKNOWN' })
  })

  it('invokeMergeTs calls merge_ts', async () => {
    mockInvoke.mockResolvedValue('/tmp/out.mp4')
    const result = await invokeMergeTs('/tmp/segs', 'ffmpeg')
    expect(mockInvoke).toHaveBeenCalledWith('merge_ts', { dir: '/tmp/segs', ffmpegPath: 'ffmpeg' })
    expect(result).toBe('/tmp/out.mp4')
  })

  it('invokeMergeTs throws DOWNLOAD_ERROR', async () => {
    mockInvoke.mockRejectedValue('ffmpeg failed')
    await expect(invokeMergeTs('/tmp/segs', 'ffmpeg')).rejects.toMatchObject({
      code: 'DOWNLOAD_ERROR',
    })
  })

  it('invokeMergeTaskSegments calls merge_task_segments with camelCase args', async () => {
    mockInvoke.mockResolvedValue('/tmp/video.mp4')
    const result = await invokeMergeTaskSegments('t1', 'ffmpeg', '/tmp', 'video.mp4')
    expect(mockInvoke).toHaveBeenCalledWith('merge_task_segments', {
      taskId: 't1',
      ffmpegPath: 'ffmpeg',
      outputDir: '/tmp',
      filename: 'video.mp4',
    })
    expect(result).toBe('/tmp/video.mp4')
  })

  it('invokeMergeTaskSegments throws DOWNLOAD_ERROR', async () => {
    mockInvoke.mockRejectedValue('no segments')
    await expect(
      invokeMergeTaskSegments('t1', 'ffmpeg', '/tmp', 'video.mp4'),
    ).rejects.toMatchObject({ code: 'DOWNLOAD_ERROR' })
  })

  it('invokeGetDefaultDownloadDir calls command and defaults code to UNKNOWN', async () => {
    mockInvoke.mockResolvedValue('/home/user/Downloads')
    await expect(invokeGetDefaultDownloadDir()).resolves.toBe('/home/user/Downloads')
    mockInvoke.mockRejectedValue('fail')
    await expect(invokeGetDefaultDownloadDir()).rejects.toMatchObject({ code: 'UNKNOWN' })
  })
})

describe('event listeners', () => {
  const mockListen = vi.mocked(listen)

  beforeEach(() => {
    mockListen.mockReset()
  })

  it('onDownloadProgress forwards payload', async () => {
    let handler: ((ev: { payload: unknown }) => void) | null = null
    mockListen.mockImplementation((_event, cb) => {
      handler = cb as unknown as (ev: { payload: unknown }) => void
      return Promise.resolve(() => {})
    })
    const received: unknown[] = []
    await onDownloadProgress((e) => received.push(e))
    expect(mockListen).toHaveBeenCalledWith('download-progress', expect.any(Function))
    handler!({
      payload: { task_id: 't1', percent: 42, speed: '1 MB/s', downloaded: 4, total: 10 },
    })
    expect(received).toEqual([
      { task_id: 't1', percent: 42, speed: '1 MB/s', downloaded: 4, total: 10 },
    ])
  })

  it('onDownloadComplete forwards payload', async () => {
    let handler: ((ev: { payload: unknown }) => void) | null = null
    mockListen.mockImplementation((_event, cb) => {
      handler = cb as unknown as (ev: { payload: unknown }) => void
      return Promise.resolve(() => {})
    })
    const received: unknown[] = []
    await onDownloadComplete((e) => received.push(e))
    expect(mockListen).toHaveBeenCalledWith('download-complete', expect.any(Function))
    handler!({ payload: { task_id: 't1', output_path: '/tmp/video.mp4' } })
    expect(received).toEqual([{ task_id: 't1', output_path: '/tmp/video.mp4' }])
  })

  it('onDownloadError forwards payload', async () => {
    let handler: ((ev: { payload: unknown }) => void) | null = null
    mockListen.mockImplementation((_event, cb) => {
      handler = cb as unknown as (ev: { payload: unknown }) => void
      return Promise.resolve(() => {})
    })
    const received: unknown[] = []
    await onDownloadError((e) => received.push(e))
    expect(mockListen).toHaveBeenCalledWith('download-error', expect.any(Function))
    handler!({ payload: { task_id: 't1', error: 'boom' } })
    expect(received).toEqual([{ task_id: 't1', error: 'boom' }])
  })

  it('returns the unlisten function from listen', async () => {
    const unlisten = vi.fn()
    mockListen.mockResolvedValue(unlisten)
    const result = await onDownloadProgress(() => {})
    expect(result).toBe(unlisten)
  })
})
