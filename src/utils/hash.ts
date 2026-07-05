/**
 * 哈希计算工具（使用 Web Crypto API 和 Tauri 文件流计算）
 */

import { invoke } from '@tauri-apps/api/core'
import { TauriError } from '@/utils/errors'

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA3-256' | 'SHA3-512'

export interface HashAlgorithmEntry {
  label: string
  value: HashAlgorithm
}

export const HASH_ALGORITHMS: HashAlgorithmEntry[] = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-384', value: 'SHA-384' },
  { label: 'SHA-512', value: 'SHA-512' },
  { label: 'SHA3-256', value: 'SHA3-256' },
  { label: 'SHA3-512', value: 'SHA3-512' },
]

// ---------------------------------------------------------------------------
// Pure JS MD5
// ---------------------------------------------------------------------------

function md5RotateLeft(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function md5F(b: number, c: number, d: number): number {
  return (b & c) | (~b & d)
}
function md5G(b: number, c: number, d: number): number {
  return (b & d) | (c & ~d)
}
function md5H(b: number, c: number, d: number): number {
  return b ^ c ^ d
}
function md5I(b: number, c: number, d: number): number {
  return c ^ (b | ~d)
}

/** Convert a JS string to a UTF-8 byte array. */
function md5StringToBytes(s: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i)
    if (c < 0x80) {
      bytes.push(c)
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    } else {
      // surrogate pair
      i++
      c = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff))
      bytes.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      )
    }
  }
  return bytes
}

/** Pack a byte array into little-endian 32-bit words. */
function md5BytesToWords(bytes: number[]): number[] {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      ((bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0),
    )
  }
  return words
}

export function calculateMd5(input: string): string {
  const bytes = md5StringToBytes(input)
  const bitLen = bytes.length * 8

  // padding: append 0x80, then zeros until 56 mod 64
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) {
    bytes.push(0x00)
  }

  // append length as 64-bit little-endian
  bytes.push(bitLen & 0xff)
  bytes.push((bitLen >> 8) & 0xff)
  bytes.push((bitLen >> 16) & 0xff)
  bytes.push((bitLen >> 24) & 0xff)
  bytes.push(0, 0, 0, 0) // high 32 bits — 0 for inputs < 2³² bits

  // T-table: T[i] = floor(2³² × |sin(i+1)|)
  const T: number[] = []
  for (let i = 1; i <= 64; i++) {
    T.push((Math.floor(Math.abs(Math.sin(i)) * 0x100000000)) >>> 0)
  }

  // shift amounts per round
  const shifts: number[] = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ]

  const words = md5BytesToWords(bytes)

  // initial state
  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  for (let offset = 0; offset < words.length; offset += 16) {
    const X = words.slice(offset, offset + 16)
    let A = a
    let B = b
    let C = c
    let D = d

    for (let i = 0; i < 64; i++) {
      let Fn: number
      let g: number
      if (i < 16) {
        Fn = md5F(B, C, D)
        g = i
      } else if (i < 32) {
        Fn = md5G(B, C, D)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        Fn = md5H(B, C, D)
        g = (3 * i + 5) % 16
      } else {
        Fn = md5I(B, C, D)
        g = (7 * i) % 16
      }

      Fn = (Fn + A + T[i] + X[g]) >>> 0
      A = D
      D = C
      C = B
      B = (B + md5RotateLeft(Fn, shifts[i])) >>> 0
    }

    a = (a + A) >>> 0
    b = (b + B) >>> 0
    c = (c + C) >>> 0
    d = (d + D) >>> 0
  }

  // output as 32 hex chars, little-endian per word
  const leHex = (n: number): string =>
    (n & 0xff).toString(16).padStart(2, '0') +
    ((n >> 8) & 0xff).toString(16).padStart(2, '0') +
    ((n >> 16) & 0xff).toString(16).padStart(2, '0') +
    ((n >> 24) & 0xff).toString(16).padStart(2, '0')

  return leHex(a) + leHex(b) + leHex(c) + leHex(d)
}

// ---------------------------------------------------------------------------
// calculateHash — dispatches MD5 to pure JS, SHA3 guards, rest via Web Crypto
// ---------------------------------------------------------------------------

export async function calculateHash(input: string, algorithm: HashAlgorithm): Promise<string> {
  if (algorithm === 'MD5') {
    return calculateMd5(input)
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(input)

  // SHA3 is supported in modern browsers (Chrome 130+, Firefox 132+) but not
  // universally — let any unsupported-environment error propagate.
  try {
    const hashBuffer = await crypto.subtle.digest(algorithm, data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch (e) {
    if (algorithm.startsWith('SHA3')) {
      throw new Error(`${algorithm} is not supported in this browser`)
    }
    throw e
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

export async function sha1(input: string): Promise<string> {
  return calculateHash(input, 'SHA-1')
}

export async function sha256(input: string): Promise<string> {
  return calculateHash(input, 'SHA-256')
}

export async function sha384(input: string): Promise<string> {
  return calculateHash(input, 'SHA-384')
}

export async function sha512(input: string): Promise<string> {
  return calculateHash(input, 'SHA-512')
}

// ---------------------------------------------------------------------------
// hashFile — calls Rust backend with path + algorithm
// ---------------------------------------------------------------------------

export async function hashFile(path: string, algorithm: HashAlgorithm = 'SHA-256'): Promise<string> {
  try {
    return await invoke<string>('hash_file', { path, algorithm })
  } catch (e) {
    throw TauriError.from(e)
  }
}
