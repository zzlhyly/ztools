import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseJwt, base64urlDecode, isExpired } from '../jwt'

describe('base64urlDecode', () => {
  it('decodes standard base64url', () => {
    // '{"alg":"HS256"}' in base64url
    const encoded = 'eyJhbGciOiJIUzI1NiJ9'
    expect(base64urlDecode(encoded)).toBe('{"alg":"HS256"}')
  })
})

describe('parseJwt', () => {
  it('parses a valid 3-part JWT', () => {
    const result = parseJwt('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc')
    expect(result).not.toBeNull()
    expect(result!.header).toEqual({ alg: 'HS256' })
    expect(result!.payload).toEqual({ sub: '123' })
    expect(result!.signature).toBe('abc')
  })

  it('returns null for invalid input', () => {
    expect(parseJwt('invalid')).toBeNull()
  })

  it('returns null for 2-part token (no signature)', () => {
    expect(parseJwt('a.b')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseJwt('')).toBeNull()
  })
})

describe('isExpired', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for future exp', () => {
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'))
    const future = { exp: Math.floor(Date.now() / 1000) + 3600 }
    expect(isExpired(future)).toBe(false)
  })

  it('returns true for past exp', () => {
    expect(isExpired({ exp: 1 })).toBe(true)
  })

  it('returns false when no exp field', () => {
    expect(isExpired({})).toBe(false)
  })
})
