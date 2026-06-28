import { describe, it, expect } from 'vitest'
import { HASH_ALGORITHMS, calculateHash, calculateMd5, sha1, sha256, sha384, sha512, hashFile } from '../hash'

describe('HASH_ALGORITHMS', () => {
  it('contains 7 algorithms', () => {
    expect(HASH_ALGORITHMS.map(a => a.value)).toEqual(['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'SHA3-256', 'SHA3-512'])
  })
  it('each has label and value', () => {
    HASH_ALGORITHMS.forEach(a => { expect(a.label).toBeTruthy(); expect(a.value).toBeTruthy() })
  })
})

describe('calculateMd5', () => {
  it('"hello" -> 5d41402abc4b2a76b9719d911017c592', () => {
    expect(calculateMd5('hello')).toBe('5d41402abc4b2a76b9719d911017c592')
  })
  it('"" -> d41d8cd98f00b204e9800998ecf8427e', () => {
    expect(calculateMd5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
  it('"The quick brown fox jumps over the lazy dog" -> 9e107d9d372bb6826bd81d3542a419d6', () => {
    expect(calculateMd5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6')
  })
  it('Chinese text works', () => {
    const r = calculateMd5('\u4f60\u597d')
    expect(r).toHaveLength(32); expect(/^[0-9a-f]+$/.test(r)).toBe(true)
  })
})

describe('calculateHash', () => {
  it('MD5 via calculateHash', async () => {
    expect(await calculateHash('hello', 'MD5')).toBe('5d41402abc4b2a76b9719d911017c592')
  })
  it('SHA-256', async () => {
    expect(await calculateHash('hello', 'SHA-256')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })
  it('SHA-1', async () => {
    expect(await sha1('hello')).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })
  it('empty string', async () => {
    expect(await sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
  it('unicode', async () => {
    const h = await sha256('\u4f60\u597d')
    expect(h).toHaveLength(64); expect(h).toMatch(/^[0-9a-f]+$/)
  })
})
