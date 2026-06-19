import { describe, it, expect } from 'vitest'
import { sha1, sha256, sha384, sha512, calculateHash } from '../hash'

describe('Hash Calculator', () => {
  it('should calculate SHA-1 hash', async () => {
    const hash = await sha1('hello')
    expect(hash).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })

  it('should calculate SHA-256 hash', async () => {
    const hash = await sha256('hello')
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('should calculate SHA-384 hash', async () => {
    const hash = await sha384('hello')
    expect(hash).toHaveLength(96)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('should calculate SHA-512 hash', async () => {
    const hash = await sha512('hello')
    expect(hash).toHaveLength(128)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('should handle empty string', async () => {
    const hash = await sha256('')
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('should handle Chinese characters', async () => {
    const hash = await sha256('你好')
    expect(hash).toBeTruthy()
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('should use calculateHash with algorithm parameter', async () => {
    const sha256Hash = await calculateHash('hello', 'SHA-256')
    expect(sha256Hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })
})