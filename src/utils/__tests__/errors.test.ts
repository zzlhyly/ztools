import { describe, it, expect } from 'vitest'
import { TauriError } from '@/utils/errors'

describe('TauriError', () => {
  describe('constructor', () => {
    it('should set name to TauriError', () => {
      const err = new TauriError('test message', 'TEST_CODE')
      expect(err.name).toBe('TauriError')
    })

    it('should store code and message', () => {
      const err = new TauriError('test message', 'TEST_CODE')
      expect(err.code).toBe('TEST_CODE')
      expect(err.message).toBe('test message')
    })
  })

  describe('from()', () => {
    it('should extract [NETWORK_ERROR] from bracket-prefixed string', () => {
      const err = TauriError.from('[NETWORK_ERROR] Connection refused')
      expect(err.code).toBe('NETWORK_ERROR')
      expect(err.message).toBe('Connection refused')
    })

    it('should extract [FILE_NOT_FOUND] with path', () => {
      const err = TauriError.from('[FILE_NOT_FOUND] /tmp/test.txt: No such file or directory')
      expect(err.code).toBe('FILE_NOT_FOUND')
      expect(err.message).toBe('/tmp/test.txt: No such file or directory')
    })

    it('should extract [PERMISSION_DENIED]', () => {
      const err = TauriError.from('[PERMISSION_DENIED] /etc/secret: Permission denied')
      expect(err.code).toBe('PERMISSION_DENIED')
      expect(err.message).toBe('/etc/secret: Permission denied')
    })

    it('should extract [UNSUPPORTED]', () => {
      const err = TauriError.from('[UNSUPPORTED] Live streams are not supported')
      expect(err.code).toBe('UNSUPPORTED')
      expect(err.message).toBe('Live streams are not supported')
    })

    it('should extract [INVALID_INPUT]', () => {
      const err = TauriError.from('[INVALID_INPUT] Unsupported hash algorithm: MD5')
      expect(err.code).toBe('INVALID_INPUT')
      expect(err.message).toBe('Unsupported hash algorithm: MD5')
    })

    it('should fall back to defaultCode when no bracket prefix', () => {
      const err = TauriError.from('Some random error string')
      expect(err.code).toBe('UNKNOWN')
      expect(err.message).toBe('Some random error string')
    })

    it('should use provided defaultCode when no bracket prefix', () => {
      const err = TauriError.from('Something went wrong', 'DOWNLOAD_ERROR')
      expect(err.code).toBe('DOWNLOAD_ERROR')
      expect(err.message).toBe('Something went wrong')
    })

    it('should handle empty string', () => {
      const err = TauriError.from('')
      expect(err.code).toBe('UNKNOWN')
      expect(err.message).toBe('')
    })

    it('should handle Error objects', () => {
      const err = TauriError.from(new Error('plain error'))
      expect(err.code).toBe('UNKNOWN')
      expect(err.message).toBe('Error: plain error')
    })

    it('should extract code from Error objects with bracket prefix', () => {
      const err = TauriError.from('[FFMPEG_ERROR] Conversion failed')
      expect(err.code).toBe('FFMPEG_ERROR')
      expect(err.message).toBe('Conversion failed')
    })
  })
})
