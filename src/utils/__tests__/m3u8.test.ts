import { describe, it, expect } from 'vitest'
import { parseCurlCommand } from '../m3u8'

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
