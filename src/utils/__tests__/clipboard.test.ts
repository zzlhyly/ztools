import { describe, it, expect, vi, beforeEach } from 'vitest'
import { copyToClipboard, pasteFromClipboard } from '../clipboard'

// Mock navigator.clipboard
const clipboardMock = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue('test content'),
}

Object.defineProperty(navigator, 'clipboard', {
  value: clipboardMock,
  writable: true,
})

describe('Clipboard Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should copy text to clipboard', async () => {
    const result = await copyToClipboard('test')
    expect(result).toBe(true)
    expect(clipboardMock.writeText).toHaveBeenCalledWith('test')
  })

  it('should paste text from clipboard', async () => {
    const text = await pasteFromClipboard()
    expect(text).toBe('test content')
    expect(clipboardMock.readText).toHaveBeenCalled()
  })

  it('should handle copy error gracefully', async () => {
    clipboardMock.writeText.mockRejectedValueOnce(new Error('Permission denied'))
    // Mock document.execCommand for fallback
    document.execCommand = vi.fn().mockReturnValue(true)
    const result = await copyToClipboard('test')
    expect(result).toBe(true)
  })
})
