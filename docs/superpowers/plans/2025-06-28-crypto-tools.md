# Crypto Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 crypto/identifier tools (AES, RSA keygen, RSA crypto, HMAC, UUID) and redesign the Hash calculator. All crypto via Web Crypto API. One Rust backend change for file hash.

**Architecture:** Shared crypto utilities in `src/utils/crypto.ts` provide AES/RSA/HMAC/UUID functions. Each tool is a standalone Vue SFC using ToolLayout/ToolTextarea/CodeOutput pattern. No new npm dependencies.

**Tech Stack:** Vue 3 + TypeScript (frontend), Rust/ring (backend hash_file only), vitest + jsdom (testing)

## Global Constraints

- **No new npm dependencies** — Web Crypto API only
- **Pure Web Crypto API** — no keys sent to backend
- **Auto-recalculate** — when any parameter changes and last operation succeeded, re-run
- **Two-layer error handling** — input validation before Web Crypto, friendly fallback for DOMException
- **Output format toggle** — Base64 (default) / HEX for AES and RSA tools
- **AES modes:** CBC (default), ECB, CTR, GCM only (CFB/OFB removed — not in Web Crypto)
- **AES key sizes:** 128, 192, 256 bit
- **AES paddings:** PKCS7 (default), NoPadding, ZeroPadding, ISO10126, ANSI X.923
- **RSA key sizes:** 1024, 2048 (default), 4096
- **RSA encrypt paddings:** PKCS#1 v1.5, OAEP-SHA-1, OAEP-SHA-256 (default), OAEP-SHA-512
- **RSA sign paddings:** PKCS#1 v1.5, PSS-SHA-256 (default), PSS-SHA-512
- **GCM tag:** fixed 128-bit; encrypt outputs ciphertext+tag, decrypt splits last 16 bytes
- **RSA dual-use:** same PEM key works for both encrypt and sign (re-imported with different algorithm name)
- **SHA3:** kept but runtime-detected; greyed out if unavailable
- **MD5:** custom pure-JS implementation
- **UUID:** v4 only initially (v1/v7 future enhancement)
- **HMAC key:** auto-detect HEX vs UTF-8; no random generate
- **RSA input limit:** live byte count display; encrypt disabled when exceeded
- **NoPadding:** real-time byte alignment indicator for AES
- **Test vectors:** hand-picked from RFCs/Wikipedia, not NIST parsing
- **TDD:** every task: write test -> run (fail) -> implement -> run (pass) -> commit
- **Tests use real crypto.subtle (jsdom 20+ supports it). Mock only for error simulation.**

---

### Task 1: Format Conversion Utilities + Error Types

**Files:**
- Create: `src/utils/crypto.ts`
- Create: `src/utils/__tests__/crypto.test.ts`

**Interfaces:**
- Produces: `CryptoError`, `arrayBufferToBase64`, `base64ToArrayBuffer`, `arrayBufferToHex`, `hexToArrayBuffer`, `detectKeyFormat`, `parseKeyBytes`, `padPKCS7`, `unpadPKCS7`, `padZero`, `unpadZero`

- [ ] **Step 1: Write test file**

Create `src/utils/__tests__/crypto.test.ts` with these test suites (all edge cases):

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  CryptoError, arrayBufferToBase64, base64ToArrayBuffer,
  arrayBufferToHex, hexToArrayBuffer, detectKeyFormat,
  parseKeyBytes, padPKCS7, unpadPKCS7, padZero, unpadZero,
} from '../crypto'

describe('CryptoError', () => {
  it('extends Error with name CryptoError', () => {
    const e = new CryptoError('msg')
    expect(e.name).toBe('CryptoError')
    expect(e.message).toBe('msg')
    expect(e).toBeInstanceOf(Error)
  })
})

describe('arrayBufferToBase64', () => {
  it('empty buffer -> ""', () => {
    expect(arrayBufferToBase64(new Uint8Array([]).buffer)).toBe('')
  })
  it('"hello" -> "aGVsbG8="', () => {
    const buf = new TextEncoder().encode('hello').buffer
    expect(arrayBufferToBase64(buf)).toBe('aGVsbG8=')
  })
  it('binary byte 0xFB -> "+w=="', () => {
    expect(arrayBufferToBase64(new Uint8Array([0xFB]).buffer)).toBe('+w==')
  })
  it('0x00,0x00,0x00 -> "AAAA"', () => {
    expect(arrayBufferToBase64(new Uint8Array([0,0,0]).buffer)).toBe('AAAA')
  })
})

describe('base64ToArrayBuffer', () => {
  it('"" -> empty', () => {
    expect(new Uint8Array(base64ToArrayBuffer('')).length).toBe(0)
  })
  it('"aGVsbG8=" -> "hello"', () => {
    expect(new TextDecoder().decode(base64ToArrayBuffer('aGVsbG8='))).toBe('hello')
  })
  it('unpadded "aGVsbG8" -> "hello"', () => {
    expect(new TextDecoder().decode(base64ToArrayBuffer('aGVsbG8'))).toBe('hello')
  })
  it('throws on invalid chars "!!!"', () => {
    expect(() => base64ToArrayBuffer('!!!')).toThrow(CryptoError)
  })
})

describe('arrayBufferToHex', () => {
  it('empty -> ""', () => {
    expect(arrayBufferToHex(new Uint8Array([]).buffer)).toBe('')
  })
  it('0xDE,0xAD,0xBE,0xEF -> "deadbeef"', () => {
    expect(arrayBufferToHex(new Uint8Array([0xDE,0xAD,0xBE,0xEF]).buffer)).toBe('deadbeef')
  })
  it('0x00,0x01 -> "0001" (leading zero preserved)', () => {
    expect(arrayBufferToHex(new Uint8Array([0,1]).buffer)).toBe('0001')
  })
  it('0xFF -> "ff" (single byte)', () => {
    expect(arrayBufferToHex(new Uint8Array([255]).buffer)).toBe('ff')
  })
})

describe('hexToArrayBuffer', () => {
  it('"" -> empty', () => {
    expect(new Uint8Array(hexToArrayBuffer('')).length).toBe(0)
  })
  it('"deadbeef" -> [0xDE,0xAD,0xBE,0xEF]', () => {
    expect(Array.from(new Uint8Array(hexToArrayBuffer('deadbeef')))).toEqual([0xDE,0xAD,0xBE,0xEF])
  })
  it('"DEADBEEF" uppercase -> same', () => {
    expect(Array.from(new Uint8Array(hexToArrayBuffer('DEADBEEF')))).toEqual([0xDE,0xAD,0xBE,0xEF])
  })
  it('"DeAdBeEf" mixed case -> same', () => {
    expect(Array.from(new Uint8Array(hexToArrayBuffer('DeAdBeEf')))).toEqual([0xDE,0xAD,0xBE,0xEF])
  })
  it('throws on odd length "abc"', () => {
    expect(() => hexToArrayBuffer('abc')).toThrow(CryptoError)
  })
  it('throws on non-hex "xyz1"', () => {
    expect(() => hexToArrayBuffer('xyz1')).toThrow(CryptoError)
  })
})

describe('detectKeyFormat', () => {
  it('long hex "deadbeef12345678" -> "hex"', () => {
    expect(detectKeyFormat('deadbeef12345678')).toBe('hex')
  })
  it('base64 with padding "aGVsbG8=" -> "base64"', () => {
    expect(detectKeyFormat('aGVsbG8=')).toBe('base64')
  })
  it('plain text "hello world" -> "text"', () => {
    expect(detectKeyFormat('hello world')).toBe('text')
  })
  it('short ambiguous hex "ab12" -> "hex"', () => {
    expect(detectKeyFormat('ab12')).toBe('hex')
  })
  it('empty string -> "text"', () => {
    expect(detectKeyFormat('')).toBe('text')
  })
})

describe('parseKeyBytes', () => {
  it('hex key "deadbeef" -> [0xDE,0xAD,0xBE,0xEF]', () => {
    expect(Array.from(parseKeyBytes('deadbeef'))).toEqual([0xDE,0xAD,0xBE,0xEF])
  })
  it('text key "hello" -> UTF-8 bytes', () => {
    expect(new TextDecoder().decode(parseKeyBytes('hello'))).toBe('hello')
  })
  it('base64 key "aGVsbG8=" -> "hello"', () => {
    expect(new TextDecoder().decode(parseKeyBytes('aGVsbG8='))).toBe('hello')
  })
})

describe('padPKCS7', () => {
  it('[1,2,3] pad to 16 -> 13 bytes of 0x0D appended', () => {
    const r = padPKCS7(new Uint8Array([1,2,3]), 16)
    expect(r.length).toBe(16)
    for (let i=3;i<16;i++) expect(r[i]).toBe(13)
  })
  it('full 16 bytes -> 16 bytes of 0x10 appended', () => {
    const r = padPKCS7(new Uint8Array(16).fill(0xAA), 16)
    expect(r.length).toBe(32)
    for (let i=16;i<32;i++) expect(r[i]).toBe(16)
  })
  it('block size 8: [1] -> 7 bytes of 0x07', () => {
    const r = padPKCS7(new Uint8Array([1]), 8)
    expect(r.length).toBe(8)
    for (let i=1;i<8;i++) expect(r[i]).toBe(7)
  })
})

describe('unpadPKCS7', () => {
  it('remove valid PKCS7 padding', () => {
    const d = new Uint8Array([1,2,3,...Array(13).fill(13)])
    expect(Array.from(unpadPKCS7(d, 16))).toEqual([1,2,3])
  })
  it('throws on invalid pad value 0xFF', () => {
    const d = new Uint8Array([1,2,3,...Array(13).fill(0xFF)])
    expect(() => unpadPKCS7(d, 16)).toThrow(CryptoError)
  })
  it('throws on zero pad value', () => {
    expect(() => unpadPKCS7(new Uint8Array(16), 16)).toThrow(CryptoError)
  })
  it('throws on empty data', () => {
    expect(() => unpadPKCS7(new Uint8Array([]), 16)).toThrow(CryptoError)
  })
})

describe('padZero / unpadZero', () => {
  it('pad [1,2,3] to 16', () => {
    const r = padZero(new Uint8Array([1,2,3]), 16)
    expect(r.length).toBe(16)
    expect(r[0]).toBe(1); expect(r[2]).toBe(3); expect(r[15]).toBe(0)
  })
  it('unpad trailing zeros', () => {
    expect(Array.from(unpadZero(new Uint8Array([1,2,3,0,0,0])))).toEqual([1,2,3])
  })
  it('unpad all zeros -> empty', () => {
    expect(unpadZero(new Uint8Array([0,0,0])).length).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/utils/__tests__/crypto.test.ts
```

Expected: All tests fail (module or functions not found).

- [ ] **Step 3: Implement**

Create `src/utils/crypto.ts`:

```typescript
/**
 * Encryption utilities (AES, RSA, HMAC, UUID)
 * All crypto via Web Crypto API. Keys never leave the browser.
 */

export class CryptoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CryptoError'
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  } catch {
    throw new CryptoError('Invalid Base64 input')
  }
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new CryptoError('HEX string must have even length')
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new CryptoError('Invalid HEX characters')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

export function detectKeyFormat(input: string): 'hex' | 'base64' | 'text' {
  if (input.length === 0) return 'text'
  if (input.length >= 2 && input.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(input)) {
    if (input.length > 8) return 'hex'
    if (/[a-fA-F]/.test(input) && /[0-9]/.test(input)) return 'hex'
  }
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(input) && input.length >= 4) {
    return 'base64'
  }
  return 'text'
}

export function parseKeyBytes(input: string): Uint8Array {
  const format = detectKeyFormat(input)
  if (format === 'hex') return new Uint8Array(hexToArrayBuffer(input))
  if (format === 'base64') return new Uint8Array(base64ToArrayBuffer(input))
  return new TextEncoder().encode(input)
}

export function padPKCS7(data: Uint8Array, blockSize: number): Uint8Array {
  const padLen = blockSize - (data.length % blockSize)
  const result = new Uint8Array(data.length + padLen)
  result.set(data)
  result.fill(padLen, data.length)
  return result
}

export function unpadPKCS7(data: Uint8Array, blockSize: number): Uint8Array {
  if (data.length === 0) throw new CryptoError('Empty data')
  if (data.length % blockSize !== 0) throw new CryptoError('Data not block-aligned')
  const padLen = data[data.length - 1]
  if (padLen === 0 || padLen > blockSize) throw new CryptoError('Invalid PKCS7 padding')
  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) throw new CryptoError('Invalid PKCS7 padding')
  }
  return data.slice(0, data.length - padLen)
}

export function padZero(data: Uint8Array, blockSize: number): Uint8Array {
  const padLen = blockSize - (data.length % blockSize)
  if (padLen === blockSize) return new Uint8Array(data)
  const result = new Uint8Array(data.length + padLen)
  result.set(data)
  return result
}

export function unpadZero(data: Uint8Array): Uint8Array {
  let end = data.length
  while (end > 0 && data[end - 1] === 0) end--
  return data.slice(0, end)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/utils/__tests__/crypto.test.ts
```

Expected: ALL TESTS PASS (25+ tests green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/crypto.ts src/utils/__tests__/crypto.test.ts
git commit -m "feat: add crypto error types and format conversion utilities"
```

---

### Task 2: AES Encrypt/Decrypt + Key Generation

**Files:**
- Modify: `src/utils/crypto.ts` (append)
- Modify: `src/utils/__tests__/crypto.test.ts` (append)

**Interfaces:**
- Produces: `generateAesKey(bitLength)`, `generateAesIv()`, `aesEncrypt(plaintext,keyHex,ivHex,mode,bitLength,padding)`, `aesDecrypt(input,keyHex,ivHex,mode,bitLength,padding)`

- [ ] **Step 1: Append AES test code**

Add these imports at top of crypto.test.ts:
```typescript
import { generateAesKey, generateAesIv, aesEncrypt, aesDecrypt } from '../crypto'
```

Add these describe blocks at end:
```typescript
describe('generateAesIv', () => {
  it('returns 32-char hex (16 bytes)', () => {
    const iv = generateAesIv()
    expect(iv).toHaveLength(32)
    expect(/^[0-9a-f]{32}$/.test(iv)).toBe(true)
  })
  it('generates unique values', () => {
    expect(generateAesIv()).not.toBe(generateAesIv())
  })
})

describe('aesEncrypt + aesDecrypt (real crypto.subtle)', () => {
  const keyHex256='603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4'
  const keyHex128='2b7e151628aed2a6abf7158809cf4f3c'
  const keyHex192='8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b'
  const ivHex='000102030405060708090a0b0c0d0e0f'

  it('encrypt + decrypt AES-256-CBC PKCS7 roundtrip', async () => {
    const c = await aesEncrypt('Hello World', keyHex256, ivHex, 'CBC', 256, 'PKCS7')
    expect(typeof c).toBe('string')
    expect(await aesDecrypt(c, keyHex256, ivHex, 'CBC', 256, 'PKCS7')).toBe('Hello World')
  })
  it('empty string roundtrip', async () => {
    const c = await aesEncrypt('', keyHex256, ivHex, 'CBC', 256, 'PKCS7')
    expect(await aesDecrypt(c, keyHex256, ivHex, 'CBC', 256, 'PKCS7')).toBe('')
  })
  it('unicode roundtrip', async () => {
    const c = await aesEncrypt('\u4f60\u597d\u4e16\u754c\ud83c\udf0d', keyHex256, ivHex, 'CBC', 256, 'PKCS7')
    expect(await aesDecrypt(c, keyHex256, ivHex, 'CBC', 256, 'PKCS7')).toBe('\u4f60\u597d\u4e16\u754c\ud83c\udf0d')
  })
  it('AES-128 roundtrip', async () => {
    const c = await aesEncrypt('test', keyHex128, ivHex, 'CBC', 128, 'PKCS7')
    expect(await aesDecrypt(c, keyHex128, ivHex, 'CBC', 128, 'PKCS7')).toBe('test')
  })
  it('AES-192 roundtrip', async () => {
    const c = await aesEncrypt('test', keyHex192, ivHex, 'CBC', 192, 'PKCS7')
    expect(await aesDecrypt(c, keyHex192, ivHex, 'CBC', 192, 'PKCS7')).toBe('test')
  })
  it('ECB mode (no IV) roundtrip', async () => {
    const c = await aesEncrypt('Hello World!!!!!', keyHex256, '', 'ECB', 256, 'PKCS7')
    expect(await aesDecrypt(c, keyHex256, '', 'ECB', 256, 'PKCS7')).toBe('Hello World!!!!!')
  })
  it('CTR mode roundtrip', async () => {
    const c = await aesEncrypt('CTR mode test', keyHex256, ivHex, 'CTR', 256, 'NoPadding')
    expect(await aesDecrypt(c, keyHex256, ivHex, 'CTR', 256, 'NoPadding')).toBe('CTR mode test')
  })
  it('GCM mode roundtrip (ciphertext+tag auto-handled)', async () => {
    const c = await aesEncrypt('GCM auth test', keyHex256, ivHex, 'GCM', 256, 'NoPadding')
    expect(await aesDecrypt(c, keyHex256, ivHex, 'GCM', 256, 'NoPadding')).toBe('GCM auth test')
  })
  it('decrypt with wrong key throws', async () => {
    const c = await aesEncrypt('secret', keyHex256, ivHex, 'CBC', 256, 'PKCS7')
    await expect(aesDecrypt(c, keyHex128, ivHex, 'CBC', 256, 'PKCS7')).rejects.toThrow(/解密失败/)
  })
  it('decrypt with wrong IV throws', async () => {
    const c = await aesEncrypt('secret', keyHex256, ivHex, 'CBC', 256, 'PKCS7')
    await expect(aesDecrypt(c, keyHex256, 'ffffffffffffffffffffffffffffffff', 'CBC', 256, 'PKCS7')).rejects.toThrow(/解密失败/)
  })
  it('reject short key', async () => {
    await expect(aesEncrypt('test', 'dead', ivHex, 'CBC', 256, 'PKCS7')).rejects.toThrow(/密钥/)
  })
  it('reject short IV for CBC', async () => {
    await expect(aesEncrypt('test', keyHex256, '0001', 'CBC', 256, 'PKCS7')).rejects.toThrow(/IV/)
  })
  it('generateAesKey produces usable 256-bit key', async () => {
    const gk = await generateAesKey(256)
    expect(gk).toHaveLength(64)
    const c = await aesEncrypt('test', gk, ivHex, 'CBC', 256, 'PKCS7')
    expect(await aesDecrypt(c, gk, ivHex, 'CBC', 256, 'PKCS7')).toBe('test')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/utils/__tests__/crypto.test.ts
```

- [ ] **Step 3: Append AES implementation**

Add below existing code in `src/utils/crypto.ts`:

```typescript
// ============================================================
// AES
// ============================================================

export async function generateAesKey(bitLength: 128 | 192 | 256): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-CBC', length: bitLength }, true, ['encrypt', 'decrypt'])
  const exported = await crypto.subtle.exportKey('raw', key)
  return arrayBufferToHex(exported)
}

export function generateAesIv(): string {
  const iv = new Uint8Array(16)
  crypto.getRandomValues(iv)
  return arrayBufferToHex(iv.buffer)
}

const MODES_WITHOUT_WEB_PADDING = ['GCM', 'CTR']

export async function aesEncrypt(
  plaintext: string, keyHex: string, ivHex: string,
  mode: string, bitLength: 128 | 192 | 256, padding: string,
): Promise<string> {
  // Validate key length
  const keyBytes = hexToArrayBuffer(keyHex)
  const expectedLen = bitLength / 8
  if (keyBytes.byteLength !== expectedLen) {
    throw new CryptoError(`Key length error: expected ${expectedLen} bytes, got ${keyBytes.byteLength}`)
  }
  // Validate IV (skip ECB)
  let ivBuf: ArrayBuffer | null = null
  if (mode !== 'ECB') {
    if (ivHex.length !== 32) {
      throw new CryptoError(`IV length error: expected 16 bytes, got ${ivHex.length/2}`)
    }
    ivBuf = hexToArrayBuffer(ivHex)
  }
  // Build algorithm params
  const algoName: any = `AES-${mode}`
  const algoParams: any = { name: algoName }
  if (mode !== 'ECB') algoParams.iv = ivBuf
  if (mode === 'GCM') algoParams.tagLength = 128
  // Import key
  const key = await crypto.subtle.importKey('raw', keyBytes, algoName, false, ['encrypt'])
  // Prepare plaintext with padding
  const raw = new TextEncoder().encode(plaintext)
  let data: ArrayBuffer
  if (MODES_WITHOUT_WEB_PADDING.includes(mode) || padding === 'NoPadding') {
    data = raw.buffer
  } else if (padding === 'ZeroPadding') {
    data = padZero(raw, 16).buffer
  } else {
    // PKCS7, ISO10126, ANSI X.923 -> use PKCS7
    data = padPKCS7(raw, 16).buffer
  }
  try {
    const cipherBuffer = await crypto.subtle.encrypt(algoParams, key, data)
    return arrayBufferToBase64(cipherBuffer)
  } catch (e: any) {
    throw new CryptoError(`Encryption failed: ${e.message || 'unknown error'}`)
  }
}

export async function aesDecrypt(
  input: string, keyHex: string, ivHex: string,
  mode: string, bitLength: 128 | 192 | 256, padding: string,
): Promise<string> {
  const keyBytes = hexToArrayBuffer(keyHex)
  const expectedLen = bitLength / 8
  if (keyBytes.byteLength !== expectedLen) {
    throw new CryptoError(`Key length error: expected ${expectedLen} bytes, got ${keyBytes.byteLength}`)
  }
  let ivBuf: ArrayBuffer | null = null
  if (mode !== 'ECB') {
    if (ivHex.length !== 32) {
      throw new CryptoError(`IV length error: expected 16 bytes, got ${ivHex.length/2}`)
    }
    ivBuf = hexToArrayBuffer(ivHex)
  }
  const algoName: any = `AES-${mode}`
  const algoParams: any = { name: algoName }
  if (mode !== 'ECB') algoParams.iv = ivBuf
  if (mode === 'GCM') algoParams.tagLength = 128
  const key = await crypto.subtle.importKey('raw', keyBytes, algoName, false, ['decrypt'])
  const cipherData = base64ToArrayBuffer(input)
  try {
    const plainBuffer = await crypto.subtle.decrypt(algoParams, key, cipherData)
    const bytes = new Uint8Array(plainBuffer)
    if (MODES_WITHOUT_WEB_PADDING.includes(mode) || padding === 'NoPadding') {
      return new TextDecoder().decode(bytes)
    }
    if (padding === 'ZeroPadding') {
      return new TextDecoder().decode(unpadZero(bytes))
    }
    return new TextDecoder().decode(unpadPKCS7(bytes, 16))
  } catch (e: any) {
    throw new CryptoError(`Decryption failed: key/IV mismatch or corrupted ciphertext`)
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/utils/__tests__/crypto.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/crypto.ts src/utils/__tests__/crypto.test.ts
git commit -m "feat: add AES encrypt/decrypt and key generation"
```

---

### Task 3: RSA Key Generation + Import/Export + Payload Calc

**Files:**
- Modify: `src/utils/crypto.ts` (append)
- Modify: `src/utils/__tests__/crypto.test.ts` (append)

**Interfaces:**
- Produces: `generateRsaKeyPair(modulusLength)`, `importRsaPublicKey(pem,forEncrypt)`, `importRsaPrivateKey(pem)`, `getRsaMaxPayload(modulusLength,padding)`

- [ ] **Step 1: Append RSA key gen test code**

Add imports at top of crypto.test.ts:
```typescript
import { generateRsaKeyPair, importRsaPublicKey, importRsaPrivateKey, getRsaMaxPayload } from '../crypto'
```

Add describe blocks:
```typescript
describe('generateRsaKeyPair', () => {
  it('2048-bit -> two PEM strings', async () => {
    const keys = await generateRsaKeyPair(2048)
    expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----')
    expect(keys.publicKey).toContain('-----END PUBLIC KEY-----')
    expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----')
    expect(keys.privateKey).toContain('-----END PRIVATE KEY-----')
  })
  it('1024-bit works', async () => {
    expect((await generateRsaKeyPair(1024)).publicKey).toBeTruthy()
  })
  it('4096-bit works', async () => {
    expect((await generateRsaKeyPair(4096)).publicKey).toBeTruthy()
  })
  it('unique each call', async () => {
    const k1 = await generateRsaKeyPair(2048)
    const k2 = await generateRsaKeyPair(2048)
    expect(k1.publicKey).not.toBe(k2.publicKey)
  })
})

describe('importRsaPublicKey', () => {
  let validPem: string
  beforeAll(async () => { validPem = (await generateRsaKeyPair(2048)).publicKey })
  it('import for encryption -> RSA-OAEP key', async () => {
    const key = await importRsaPublicKey(validPem, true)
    expect(key.type).toBe('public')
    expect(key.algorithm.name).toBe('RSA-OAEP')
  })
  it('import for verification -> RSA-PSS key', async () => {
    const key = await importRsaPublicKey(validPem, false)
    expect(key.type).toBe('public')
    expect(key.algorithm.name).toBe('RSA-PSS')
  })
  it('rejects invalid PEM', async () => {
    await expect(importRsaPublicKey('not a key', true)).rejects.toThrow(/密钥/)
  })
  it('rejects empty string', async () => {
    await expect(importRsaPublicKey('', true)).rejects.toThrow(/密钥/)
  })
})

describe('importRsaPrivateKey', () => {
  let validPem: string
  beforeAll(async () => { validPem = (await generateRsaKeyPair(2048)).privateKey })
  it('imports valid PEM', async () => {
    const key = await importRsaPrivateKey(validPem)
    expect(key.type).toBe('private')
  })
  it('rejects public key as private', async () => {
    const pub = (await generateRsaKeyPair(2048)).publicKey
    await expect(importRsaPrivateKey(pub)).rejects.toThrow(/密钥/)
  })
})

describe('getRsaMaxPayload', () => {
  it('OAEP-SHA256 2048-bit -> 190', () => {
    expect(getRsaMaxPayload(2048, 'OAEP-SHA256')).toBe(190)
  })
  it('OAEP-SHA-1 2048-bit -> 214', () => {
    expect(getRsaMaxPayload(2048, 'OAEP-SHA-1')).toBe(214)
  })
  it('OAEP-SHA-512 2048-bit -> 126', () => {
    expect(getRsaMaxPayload(2048, 'OAEP-SHA-512')).toBe(126)
  })
  it('PKCS#1 v1.5 2048-bit -> 245', () => {
    expect(getRsaMaxPayload(2048, 'PKCS#1 v1.5')).toBe(245)
  })
  it('scales with key size', () => {
    expect(getRsaMaxPayload(4096,'PKCS#1 v1.5')).toBeGreaterThan(getRsaMaxPayload(2048,'PKCS#1 v1.5'))
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Append RSA key implementation**

Append to `src/utils/crypto.ts`:

```typescript
// ============================================================
// RSA
// ============================================================

const PEM_PUBLIC_HEADER = '-----BEGIN PUBLIC KEY-----'
const PEM_PUBLIC_FOOTER = '-----END PUBLIC KEY-----'
const PEM_PRIVATE_HEADER = '-----BEGIN PRIVATE KEY-----'
const PEM_PRIVATE_FOOTER = '-----END PRIVATE KEY-----'
const PEM_RSA_PRIVATE_HEADER = '-----BEGIN RSA PRIVATE KEY-----'
const PEM_RSA_PRIVATE_FOOTER = '-----END RSA PRIVATE KEY-----'

function pemToDer(pem: string): ArrayBuffer {
  const lines = pem.trim().split('\n').filter(line => !line.startsWith('-----'))
  return base64ToArrayBuffer(lines.join(''))
}

function derToPem(der: ArrayBuffer, type: 'PUBLIC KEY' | 'PRIVATE KEY'): string {
  const b64 = arrayBufferToBase64(der)
  const lines = b64.match(/.{1,64}/g)?.join('\n') || b64
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`
}

function validatePem(pem: string, header: string, footer: string): ArrayBuffer {
  if (!pem || typeof pem !== 'string') throw new CryptoError('Key format error: empty input')
  const t = pem.trim()
  if (!t.includes(header) || !t.includes(footer)) throw new CryptoError(`Key format error: expected ${header}`)
  try { return pemToDer(t) } catch { throw new CryptoError('Key format error: Base64 decode failed') }
}

export async function generateRsaKeyPair(
  modulusLength: 1024 | 2048 | 4096 = 2048,
): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' },
    true, ['encrypt', 'decrypt'])
  const pubDer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const privDer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  return {
    publicKey: derToPem(pubDer, 'PUBLIC KEY'),
    privateKey: derToPem(privDer, 'PRIVATE KEY'),
  }
}

export async function importRsaPublicKey(pem: string, forEncrypt: boolean): Promise<CryptoKey> {
  const der = validatePem(pem, PEM_PUBLIC_HEADER, PEM_PUBLIC_FOOTER)
  const algorithm = forEncrypt
    ? { name: 'RSA-OAEP', hash: 'SHA-256' }
    : { name: 'RSA-PSS', hash: 'SHA-256' }
  const usages: KeyUsage[] = forEncrypt ? ['encrypt'] : ['verify']
  try { return await crypto.subtle.importKey('spki', der, algorithm, false, usages) }
  catch (e: any) { throw new CryptoError(`Key import failed: ${e.message || 'invalid public key'}`) }
}

export async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  const t = pem.trim()
  let der: ArrayBuffer; let format: 'pkcs8' | 'pkcs1'
  if (t.includes(PEM_PRIVATE_HEADER)) {
    der = validatePem(pem, PEM_PRIVATE_HEADER, PEM_PRIVATE_FOOTER); format = 'pkcs8'
  } else if (t.includes(PEM_RSA_PRIVATE_HEADER)) {
    der = validatePem(pem, PEM_RSA_PRIVATE_HEADER, PEM_RSA_PRIVATE_FOOTER); format = 'pkcs1'
  } else {
    throw new CryptoError('Key format error: expected PRIVATE KEY PEM')
  }
  try {
    return await crypto.subtle.importKey(format, der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt'])
  } catch { throw new CryptoError('Key import failed: invalid private key') }
}

export function getRsaMaxPayload(modulusLength: number, padding: string): number {
  const keyBytes = modulusLength / 8
  if (padding === 'PKCS#1 v1.5') return keyBytes - 11
  const hashBytes = padding.includes('SHA-512') ? 64 : padding.includes('SHA-256') ? 32 : padding.includes('SHA-1') ? 20 : 32
  return keyBytes - 2 * hashBytes - 2
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/crypto.ts src/utils/__tests__/crypto.test.ts
git commit -m "feat: add RSA key generation, import/export, and payload calculation"
```

---

### Task 4: RSA Encrypt/Decrypt/Sign/Verify

**Files:**
- Modify: `src/utils/crypto.ts` (append)
- Modify: `src/utils/__tests__/crypto.test.ts` (append)

**Interfaces:**
- Produces: `rsaEncrypt(data,publicKeyPem,padding)`, `rsaDecrypt(cipherB64,privateKeyPem,padding)`, `rsaSign(data,privateKeyPem,padding)`, `rsaVerify(sigB64,data,publicKeyPem,padding)`

- [ ] **Step 1: Append RSA ops test code**

Add imports:
```typescript
import { rsaEncrypt, rsaDecrypt, rsaSign, rsaVerify } from '../crypto'
```

Add test blocks:
```typescript
describe('rsaEncrypt + rsaDecrypt', () => {
  let pubPem: string; let privPem: string
  beforeAll(async () => {
    const k = await generateRsaKeyPair(2048)
    pubPem = k.publicKey; privPem = k.privateKey
  })
  it('roundtrip OAEP-SHA256', async () => {
    expect(await rsaDecrypt(await rsaEncrypt('Hello RSA!', pubPem, 'OAEP-SHA256'), privPem, 'OAEP-SHA256')).toBe('Hello RSA!')
  })
  it('roundtrip PKCS#1 v1.5', async () => {
    expect(await rsaDecrypt(await rsaEncrypt('PKCS1 test', pubPem, 'PKCS#1 v1.5'), privPem, 'PKCS#1 v1.5')).toBe('PKCS1 test')
  })
  it('empty string roundtrip', async () => {
    expect(await rsaDecrypt(await rsaEncrypt('', pubPem, 'OAEP-SHA256'), privPem, 'OAEP-SHA256')).toBe('')
  })
  it('OAEP produces different ciphertexts', async () => {
    const c1 = await rsaEncrypt('test', pubPem, 'OAEP-SHA256')
    const c2 = await rsaEncrypt('test', pubPem, 'OAEP-SHA256')
    expect(c1).not.toBe(c2)
  })
  it('throws when data exceeds max payload', async () => {
    await expect(rsaEncrypt('x'.repeat(200), pubPem, 'OAEP-SHA256')).rejects.toThrow()
  })
  it('decrypt with wrong key throws', async () => {
    const k2 = await generateRsaKeyPair(2048)
    const c = await rsaEncrypt('secret', pubPem, 'OAEP-SHA256')
    await expect(rsaDecrypt(c, k2.privateKey, 'OAEP-SHA256')).rejects.toThrow(/解密失败/)
  })
})

describe('rsaSign + rsaVerify', () => {
  let pubPem: string; let privPem: string
  beforeAll(async () => {
    const k = await generateRsaKeyPair(2048)
    pubPem = k.publicKey; privPem = k.privateKey
  })
  it('sign+verify PSS-SHA256', async () => {
    const sig = await rsaSign('Sign this', privPem, 'PSS-SHA256')
    expect(await rsaVerify(sig, 'Sign this', pubPem, 'PSS-SHA256')).toBe(true)
  })
  it('sign+verify PKCS#1 v1.5', async () => {
    const sig = await rsaSign('PKCS1 sign', privPem, 'PKCS#1 v1.5')
    expect(await rsaVerify(sig, 'PKCS1 sign', pubPem, 'PKCS#1 v1.5')).toBe(true)
  })
  it('wrong data -> verify false', async () => {
    const sig = await rsaSign('original', privPem, 'PSS-SHA256')
    expect(await rsaVerify(sig, 'tampered', pubPem, 'PSS-SHA256')).toBe(false)
  })
  it('different key -> verify false', async () => {
    const k2 = await generateRsaKeyPair(2048)
    const sig = await rsaSign('test', k2.privateKey, 'PSS-SHA256')
    expect(await rsaVerify(sig, 'test', pubPem, 'PSS-SHA256')).toBe(false)
  })
  it('empty string sign+verify', async () => {
    const sig = await rsaSign('', privPem, 'PSS-SHA256')
    expect(await rsaVerify(sig, '', pubPem, 'PSS-SHA256')).toBe(true)
  })
  it('PSS produces different signatures', async () => {
    expect(await rsaSign('test', privPem, 'PSS-SHA256')).not.toBe(await rsaSign('test', privPem, 'PSS-SHA256'))
  })
})

describe('RSA key dual-use', () => {
  it('same key pair: encrypt+decrypt AND sign+verify', async () => {
    const k = await generateRsaKeyPair(2048)
    const c = await rsaEncrypt('dual', k.publicKey, 'OAEP-SHA256')
    expect(await rsaDecrypt(c, k.privateKey, 'OAEP-SHA256')).toBe('dual')
    const s = await rsaSign('sign', k.privateKey, 'PSS-SHA256')
    expect(await rsaVerify(s, 'sign', k.publicKey, 'PSS-SHA256')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Append RSA ops implementation**

```typescript
function getOaepHash(padding: string): string {
  if (padding.includes('SHA-512')) return 'SHA-512'
  if (padding.includes('SHA-256')) return 'SHA-256'
  if (padding.includes('SHA-1')) return 'SHA-1'
  return 'SHA-256'
}

export async function rsaEncrypt(data: string, publicKeyPem: string, padding: string): Promise<string> {
  const der = validatePem(publicKeyPem, PEM_PUBLIC_HEADER, PEM_PUBLIC_FOOTER)
  const hash = getOaepHash(padding)
  const key = await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash }, false, ['encrypt'])
  const dataBytes = new TextEncoder().encode(data)
  const maxBytes = getRsaMaxPayload((key.algorithm as any).modulusLength || 2048, padding)
  if (dataBytes.length > maxBytes) {
    throw new CryptoError(`Input exceeds ${maxBytes} byte limit (${(key.algorithm as any).modulusLength}-bit, ${padding})`)
  }
  try {
    const cipherBuf = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, dataBytes.buffer)
    return arrayBufferToBase64(cipherBuf)
  } catch (e: any) { throw new CryptoError(`Encryption failed: check key and padding compatibility`) }
}

export async function rsaDecrypt(cipherB64: string, privateKeyPem: string, padding: string): Promise<string> {
  const der = validatePem(privateKeyPem, PEM_PRIVATE_HEADER, PEM_PRIVATE_FOOTER)
  const hash = getOaepHash(padding)
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSA-OAEP', hash }, false, ['decrypt'])
  const cipherData = base64ToArrayBuffer(cipherB64)
  try {
    const plainBuf = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, cipherData)
    return new TextDecoder().decode(plainBuf)
  } catch (e: any) { throw new CryptoError(`Decryption failed: private key mismatch or corrupted ciphertext`) }
}

export async function rsaSign(data: string, privateKeyPem: string, padding: string): Promise<string> {
  const t = privateKeyPem.trim()
  let der: ArrayBuffer; let format: 'pkcs8' | 'pkcs1'
  if (t.includes(PEM_PRIVATE_HEADER)) { der = validatePem(t, PEM_PRIVATE_HEADER, PEM_PRIVATE_FOOTER); format = 'pkcs8' }
  else if (t.includes(PEM_RSA_PRIVATE_HEADER)) { der = validatePem(t, PEM_RSA_PRIVATE_HEADER, PEM_RSA_PRIVATE_FOOTER); format = 'pkcs1' }
  else { throw new CryptoError('Key format error: expected PRIVATE KEY PEM') }
  const isPss = padding.startsWith('PSS')
  const hashName = padding.includes('SHA-512') ? 'SHA-512' : padding.includes('SHA-256') ? 'SHA-256' : 'SHA-1'
  const algorithm: any = isPss ? { name: 'RSA-PSS', hash: hashName, saltLength: 32 } : { name: 'RSASSA-PKCS1-v1_5', hash: hashName }
  let key: CryptoKey
  try { key = await crypto.subtle.importKey(format, der, algorithm, false, ['sign']) }
  catch (e: any) { throw new CryptoError(`Key import failed: ${e.message}`) }
  try {
    const sigBuf = await crypto.subtle.sign(algorithm, key, new TextEncoder().encode(data))
    return arrayBufferToBase64(sigBuf)
  } catch (e: any) { throw new CryptoError(`Signing failed: invalid private key`) }
}

export async function rsaVerify(signatureB64: string, data: string, publicKeyPem: string, padding: string): Promise<boolean> {
  const der = validatePem(publicKeyPem, PEM_PUBLIC_HEADER, PEM_PUBLIC_FOOTER)
  const isPss = padding.startsWith('PSS')
  const hashName = padding.includes('SHA-512') ? 'SHA-512' : padding.includes('SHA-256') ? 'SHA-256' : 'SHA-1'
  const algorithm: any = isPss ? { name: 'RSA-PSS', hash: hashName, saltLength: 32 } : { name: 'RSASSA-PKCS1-v1_5', hash: hashName }
  let key: CryptoKey
  try { key = await crypto.subtle.importKey('spki', der, algorithm, false, ['verify']) }
  catch { throw new CryptoError('Key import failed: invalid public key') }
  try {
    const sigBytes = base64ToArrayBuffer(signatureB64)
    return await crypto.subtle.verify(algorithm, key, sigBytes, new TextEncoder().encode(data))
  } catch (e: any) { throw new CryptoError(`Verification failed: ${e.message}`) }
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/crypto.ts src/utils/__tests__/crypto.test.ts
git commit -m "feat: add RSA encrypt/decrypt/sign/verify operations"
```

---

### Task 5: HMAC + UUID

**Files:**
- Modify: `src/utils/crypto.ts` (append)
- Modify: `src/utils/__tests__/crypto.test.ts` (append)

- [ ] **Step 1: Append HMAC+UUID test code**

Add imports:
```typescript
import { computeHmac, generateUuids } from '../crypto'
```

Add tests:
```typescript
describe('computeHmac', () => {
  it('HMAC-SHA256 with text key', async () => {
    const r = await computeHmac('hello', 'secret', 'SHA-256')
    expect(r).toHaveLength(64); expect(/^[0-9a-f]+$/.test(r)).toBe(true)
  })
  it('HMAC-SHA256 with hex key', async () => {
    const r = await computeHmac('Hi There', '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b', 'SHA-256')
    expect(r).toHaveLength(64)
  })
  it('HMAC-SHA1 -> 40 chars', async () => {
    expect((await computeHmac('hello', 'key', 'SHA-1')).length).toBe(40)
  })
  it('HMAC-SHA384 -> 96 chars', async () => {
    expect((await computeHmac('hello', 'key', 'SHA-384')).length).toBe(96)
  })
  it('HMAC-SHA512 -> 128 chars', async () => {
    expect((await computeHmac('hello', 'key', 'SHA-512')).length).toBe(128)
  })
  it('empty message works', async () => {
    expect((await computeHmac('', 'key', 'SHA-256')).length).toBe(64)
  })
  it('empty key works', async () => {
    expect((await computeHmac('hello', '', 'SHA-256')).length).toBe(64)
  })
  it('unicode works', async () => {
    expect((await computeHmac('\u4f60\u597d', '\u5bc6\u94a5', 'SHA-256')).length).toBe(64)
  })
  it('different keys -> different results', async () => {
    expect(await computeHmac('hello','k1','SHA-256')).not.toBe(await computeHmac('hello','k2','SHA-256'))
  })
  it('different algorithms -> different results', async () => {
    expect(await computeHmac('hello','key','SHA-256')).not.toBe(await computeHmac('hello','key','SHA-512'))
  })
})

describe('generateUuids', () => {
  it('1 UUID', () => {
    const uuids = generateUuids(1)
    expect(uuids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('5 UUIDs', () => {
    expect(generateUuids(5).length).toBe(5)
    generateUuids(5).forEach(u => expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/))
  })
  it('100 unique UUIDs', () => {
    expect(new Set(generateUuids(100)).size).toBe(100)
  })
  it('0 -> empty array', () => {
    expect(generateUuids(0)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Append HMAC+UUID implementation**

```typescript
// ============================================================
// HMAC
// ============================================================

export async function computeHmac(message: string, key: string, algorithm: string): Promise<string> {
  const algoName: any = algorithm
  const keyBytes = parseKeyBytes(key.trim())
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: algoName }, false, ['sign'])
  const msgBytes = new TextEncoder().encode(message)
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes)
  return arrayBufferToHex(sig)
}

// ============================================================
// UUID
// ============================================================

export function generateUuids(count: number): string[] {
  const results: string[] = []
  for (let i = 0; i < count; i++) results.push(crypto.randomUUID())
  return results
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/crypto.ts src/utils/__tests__/crypto.test.ts
git commit -m "feat: add HMAC computation and UUID generation"
```

---

### Task 6: Hash Utility Update (MD5 + Algorithm List)

**Files:**
- Modify: `src/utils/hash.ts` (rewrite)
- Modify: `src/utils/__tests__/hash.test.ts` (rewrite)

- [ ] **Step 1: Write updated hash test**

Replace `src/utils/__tests__/hash.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { HASH_ALGORITHMS, calculateHash, calculateMd5, sha1, sha256, sha384, sha512, hashFile } from '../hash'

describe('HASH_ALGORITHMS', () => {
  it('contains 7 algorithms', () => {
    expect(HASH_ALGORITHMS.map(a=>a.value)).toEqual(['MD5','SHA-1','SHA-256','SHA-384','SHA-512','SHA3-256','SHA3-512'])
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
    expect(await calculateHash('hello','SHA-256')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
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
```

- [ ] **Step 2: Run tests — expect FAIL**

- [ ] **Step 3: Rewrite hash.ts**

See the complete implementation in the design spec (Task 6 in original plan). Full MD5 + SHA3 support + algorithm list. Key points:
- `HASH_ALGORITHMS` constant array with 7 entries
- `calculateMd5()` pure JS (RL rotation, 4-round Feistel, little-endian words, T-table from sin)
- `calculateHash()` dispatches MD5 to `calculateMd5`, SHA3 checks browser support, rest use `crypto.subtle.digest`
- `hashFile()` transitional: calls old API, extracts requested algorithm from 4-result response (until Task 14 Rust update)

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/utils/__tests__/hash.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/hash.ts src/utils/__tests__/hash.test.ts
git commit -m "feat: extend hash utility with MD5, SHA3, algorithm list"
```

---

### Task 7: Hash Calculator Component Redesign

**Files:**
- Modify: `src/tools/HashCalculator.vue` (rewrite)
- Modify: `src/tools/__tests__/HashCalculator.test.ts` (rewrite)

Key changes:
- Add `el-select` dropdown for algorithm selection bound to `selectedAlgorithm` ref, default `SHA-256`
- Add `#input-actions` slot with algorithm dropdown + file select button
- `handleCalculate`: only computes selected algorithm via `calculateHash(input, selectedAlgorithm)`
- `handleCalculate` for file: calls `hashFile(path, selectedAlgorithm)`
- `watch(selectedAlgorithm, autoCalculate)` — re-runs on algorithm change if last calc succeeded
- Output shows single result (no multi-algorithm listing)
- Keep file hash support, clear button
- Test: basic render checks (dropdown, textarea, calculate/clear button presence)

- [ ] **Step 1: Write test** -> expect FAIL
- [ ] **Step 2: Implement** -> see design spec for full code
- [ ] **Step 3: Run tests** -> expect PASS (basic render, clear button)
- [ ] **Step 4: Commit**

```bash
git add src/tools/HashCalculator.vue src/tools/__tests__/HashCalculator.test.ts
git commit -m "refactor: redesign Hash calculator with algorithm dropdown"
```

---

### Task 8: AES Tool Component

**Files:**
- Create: `src/tools/AesTool.vue`
- Create: `src/tools/__tests__/AesTool.test.ts`

Build the AES encrypt/decrypt tool per design spec. Key features:
- Mode dropdown: CBC(default)/ECB/CTR/GCM
- Key size: 128/192/256 bit
- Padding: PKCS7(default)/NoPadding/ZeroPadding (hidden for CTR/GCM)
- Output format: Base64(default)/HEX
- Key/IV inputs with Random generate buttons
- ECB mode hides IV row; GCM mode auto-handles auth tag
- NoPadding: real-time byte alignment warning
- Encrypt/Decrypt buttons, Clear button
- Auto-recalculate on param change

Tests: basic render (textarea, buttons, dropdowns, inputs exist; clear button works).

- [ ] **Step 1: Write test** -> expect FAIL
- [ ] **Step 2: Implement** (complete code in original plan sections)
- [ ] **Step 3: Run tests** -> expect PASS
- [ ] **Step 4: Commit**

```bash
git add src/tools/AesTool.vue src/tools/__tests__/AesTool.test.ts
git commit -m "feat: add AES encrypt/decrypt tool"
```

---

### Task 9: HMAC Calculator Component

**Files:**
- Create: `src/tools/HmacTool.vue`
- Create: `src/tools/__tests__/HmacTool.test.ts`

Build HMAC tool per design spec. Key features:
- Message textarea + Secret Key input
- Algorithm dropdown: SHA-1/SHA-256/SHA-384/SHA-512
- Auto-detect key format (HEX/UTF-8) with label display
- Output always HEX
- Calculate/Clear buttons, auto-recalculate

Tests: basic render (textarea, key input, dropdown, buttons exist; clear works).

- [ ] **Step 1: Write test** -> expect FAIL
- [ ] **Step 2: Implement** (complete code in original plan sections)
- [ ] **Step 3: Run tests** -> expect PASS
- [ ] **Step 4: Commit**

```bash
git add src/tools/HmacTool.vue src/tools/__tests__/HmacTool.test.ts
git commit -m "feat: add HMAC calculator tool"
```

---

### Task 10: RSA Key Generator Component

**Files:**
- Create: `src/tools/RsaKeyGen.vue`
- Create: `src/tools/__tests__/RsaKeyGen.test.ts`

Build RSA key gen tool. Key features:
- Key size: 1024/2048/4096, Format: PEM/DER
- Generate button -> calls generateRsaKeyPair()
- Public key panel + Private key panel (warning background)
- Copy buttons per panel
- Each click generates new key pair
- DER displayed as HEX

Tests: basic render (dropdowns, generate button, output code blocks).

- [ ] **Step 1: Write test** -> expect FAIL
- [ ] **Step 2: Implement** (complete code in original plan sections)
- [ ] **Step 3: Run tests** -> expect PASS
- [ ] **Step 4: Commit**

```bash
git add src/tools/RsaKeyGen.vue src/tools/__tests__/RsaKeyGen.test.ts
git commit -m "feat: add RSA key generator tool"
```

---

### Task 11: RSA Crypto Tool Component

**Files:**
- Create: `src/tools/RsaCrypto.vue`
- Create: `src/tools/__tests__/RsaCrypto.test.ts`

Build RSA encrypt/decrypt/sign/verify tool. Key features:
- Data textarea
- Public key multiline input + Private key multiline input
- Encrypt padding dropdown + Sign padding dropdown
- Output format: Base64/HEX
- 4 operation buttons: Public Encrypt / Private Decrypt / Private Sign / Public Verify
- Live input length display: "Current max: <=190 bytes"
- Encrypt button disabled when input too long
- Auto-recalculate on param change

Tests: basic render (textarea, key inputs, 4 buttons, dropdowns exist).

- [ ] **Step 1: Write test** -> expect FAIL
- [ ] **Step 2: Implement** (complete code in original plan sections)
- [ ] **Step 3: Run tests** -> expect PASS
- [ ] **Step 4: Commit**

```bash
git add src/tools/RsaCrypto.vue src/tools/__tests__/RsaCrypto.test.ts
git commit -m "feat: add RSA encrypt/decrypt/sign/verify tool"
```

---

### Task 12: UUID Generator Component

**Files:**
- Create: `src/tools/UuidTool.vue`
- Create: `src/tools/__tests__/UuidTool.test.ts`

Build UUID generator. Key features:
- Version: v4 only
- Count: 1/5/10/50/100
- Generate button -> calls generateUuids(count)
- Results displayed line by line
- Copy All button

Tests: basic render (dropdowns, generate button, output area).

- [ ] **Step 1: Write test** -> expect FAIL
- [ ] **Step 2: Implement** (complete code in original plan sections)
- [ ] **Step 3: Run tests** -> expect PASS
- [ ] **Step 4: Commit**

```bash
git add src/tools/UuidTool.vue src/tools/__tests__/UuidTool.test.ts
git commit -m "feat: add UUID generator tool"
```

---

### Task 13: i18n + Router + Sidebar Wiring

**Files:**
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en-US.ts`
- Modify: `src/router/index.ts`
- Modify: `src/components/Sidebar.vue`

- [ ] **Step 1: Add i18n entries**

Add to `src/i18n/zh-CN.ts` under `tools:`:
```typescript
aes: { name: 'AES 加解密', description: 'AES 对称加密和解密' },
rsaKeys: { name: 'RSA 密钥生成', description: '生成 RSA 公私钥对' },
rsaCrypto: { name: 'RSA 加解密', description: 'RSA 公钥加密、私钥解密、签名验签' },
hmac: { name: 'HMAC 计算', description: 'HMAC 消息认证码计算' },
uuid: { name: 'UUID 生成', description: 'UUID v4 生成器' },
```

Update hash description:
```typescript
hash: { name: '哈希计算', description: 'MD5、SHA1、SHA256、SHA512 等哈希计算' },
```

Add to common in zh-CN:
```typescript
encrypt: '加密',
decrypt: '解密',
generate: '生成',
random: '随机',
key: '密钥',
iv: 'IV',
mode: '模式',
keySize: '密钥长度',
padding: '填充方式',
outputFormat: '输出格式',
publicKey: '公钥',
privateKey: '私钥',
sign: '签名',
verify: '验签',
copyAll: '复制全部',
```

Add matching entries to `src/i18n/en-US.ts`.

- [ ] **Step 2: Add routes**

Add to `src/router/index.ts` routes array:
```typescript
{ path: '/aes', component: () => import('@/tools/AesTool.vue') },
{ path: '/rsa-keys', component: () => import('@/tools/RsaKeyGen.vue') },
{ path: '/rsa-crypto', component: () => import('@/tools/RsaCrypto.vue') },
{ path: '/hmac', component: () => import('@/tools/HmacTool.vue') },
{ path: '/uuid', component: () => import('@/tools/UuidTool.vue') },
```

- [ ] **Step 3: Add sidebar entries**

Add imports at top of Sidebar.vue:
```typescript
import { Shield, KeyRound, Lock, Fingerprint, Hash } from 'lucide-vue-next'
```

Add to tools array (before m3u8):
```typescript
{ path: '/aes', icon: Shield, key: 'aes' },
{ path: '/rsa-keys', icon: KeyRound, key: 'rsaKeys' },
{ path: '/rsa-crypto', icon: Lock, key: 'rsaCrypto' },
{ path: '/hmac', icon: Fingerprint, key: 'hmac' },
{ path: '/uuid', icon: Hash, key: 'uuid' },
```

Note: UUID uses `Hash` icon — rename existing Hash icon import if needed, or import as `HashIcon`. For sidebar, use lucide-vue-next's `Shield`, `KeyRound`, `Lock`, `Fingerprint`, `Hash` icons.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Fix any type errors. Run tests:
```bash
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/i18n/zh-CN.ts src/i18n/en-US.ts src/router/index.ts src/components/Sidebar.vue
git commit -m "feat: wire up new crypto tools (i18n, router, sidebar)"
```

---

### Task 14: Rust Backend hash_file Change

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/utils/hash.ts` (update hashFile to use new API)

- [ ] **Step 1: Modify Rust hash_file command**

In `src-tauri/src/lib.rs`:

Change `HashResults` to return a single hash string instead of 4:

```rust
/// Hash a file with the specified algorithm.
#[tauri::command]
async fn hash_file(path: String, algorithm: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        use std::io::Read;
        use ring::digest::{Context, SHA1_FOR_LEGACY_USE_ONLY, SHA256, SHA384, SHA512, SHA3_256, SHA3_512};

        let mut file = std::fs::File::open(&path)
            .map_err(|e| format!("Failed to open file: {}", e))?;

        let digest = match algorithm.as_str() {
            "SHA-1" => {
                let mut ctx = Context::new(&SHA1_FOR_LEGACY_USE_ONLY);
                let mut buf = [0u8; 1_048_576];
                loop {
                    let n = file.read(&mut buf).map_err(|e| format!("Read error: {}", e))?;
                    if n == 0 { break; }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            "SHA-256" => {
                let mut ctx = Context::new(&SHA256);
                let mut buf = [0u8; 1_048_576];
                loop {
                    let n = file.read(&mut buf).map_err(|e| format!("Read error: {}", e))?;
                    if n == 0 { break; }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            "SHA-384" => {
                let mut ctx = Context::new(&SHA384);
                let mut buf = [0u8; 1_048_576];
                loop {
                    let n = file.read(&mut buf).map_err(|e| format!("Read error: {}", e))?;
                    if n == 0 { break; }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            "SHA-512" => {
                let mut ctx = Context::new(&SHA512);
                let mut buf = [0u8; 1_048_576];
                loop {
                    let n = file.read(&mut buf).map_err(|e| format!("Read error: {}", e))?;
                    if n == 0 { break; }
                    ctx.update(&buf[..n]);
                }
                hex::encode(ctx.finish().as_ref())
            }
            _ => unimplemented!("Unsupported hash algorithm"),
        };

        Ok(digest)
    }).await.map_err(|e| format!("Hash task panicked: {}", e))?
}
```

Remove the old multi-threaded version. Remove `HashResults` struct. Keep `hash_file` in the invoke handler.

- [ ] **Step 2: Update frontend hashFile**

In `src/utils/hash.ts`, replace hashFile:
```typescript
export async function hashFile(path: string, algorithm: HashAlgorithm = 'SHA-256'): Promise<string> {
  return invoke('hash_file', { path, algorithm })
}
```

- [ ] **Step 3: Build and test**

```bash
npm run tauri build  # or npm run tauri dev to verify
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs src/utils/hash.ts
git commit -m "feat: update hash_file to accept algorithm parameter"
```

---

## Plan Summary

| Task | What | Approx Time |
|------|------|-------------|
| 1 | Format utils + Error types | 15min |
| 2 | AES encrypt/decrypt | 20min |
| 3 | RSA key gen + import | 20min |
| 4 | RSA encrypt/decrypt/sign/verify | 25min |
| 5 | HMAC + UUID utils | 15min |
| 6 | Hash utility update | 20min |
| 7 | Hash Calculator redesign | 20min |
| 8 | AES Tool component | 25min |
| 9 | HMAC Tool component | 15min |
| 10 | RSA Key Generator component | 20min |
| 11 | RSA Crypto Tool component | 25min |
| 12 | UUID Generator component | 10min |
| 13 | i18n + Router + Sidebar | 15min |
| 14 | Rust hash_file change | 20min |
| **Total** | | **~4.5 hours** |

Tasks 1-5 must be sequential (all build crypto.ts). After Task 5, Tasks 6-12 can be parallelized. Tasks 13-14 depend on component files existing.
