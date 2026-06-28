// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  CryptoError, arrayBufferToBase64, base64ToArrayBuffer,
  arrayBufferToHex, hexToArrayBuffer, detectKeyFormat,
  parseKeyBytes, padPKCS7, unpadPKCS7, padZero, unpadZero,
  generateAesKey, generateAesIv, aesEncrypt, aesDecrypt,
  generateRsaKeyPair, importRsaPublicKey, importRsaPrivateKey, getRsaMaxPayload,
  rsaEncrypt, rsaDecrypt, rsaSign, rsaVerify,
  computeHmac, generateUuids,
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
  it('already block-aligned: returns same content', () => {
    const data = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16])
    const result = padZero(data, 16)
    expect(result.length).toBe(16)
    expect(Array.from(result)).toEqual(Array.from(data))
    // Must be a different ArrayBuffer (safe copy)
    expect(result.buffer).not.toBe(data.buffer)
  })
})

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
  it('CTR mode roundtrip', async () => {
    const ivCtr = 'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff'
    const c = await aesEncrypt('CTR mode test', keyHex256, ivCtr, 'CTR', 256, 'NoPadding')
    expect(await aesDecrypt(c, keyHex256, ivCtr, 'CTR', 256, 'NoPadding')).toBe('CTR mode test')
  })
  it('GCM mode roundtrip (ciphertext+tag auto-handled)', async () => {
    const c = await aesEncrypt('GCM auth test', keyHex256, ivHex, 'GCM', 256, 'NoPadding')
    expect(await aesDecrypt(c, keyHex256, ivHex, 'GCM', 256, 'NoPadding')).toBe('GCM auth test')
  })
  it('decrypt with wrong key throws', async () => {
    const wrongKey = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
    const c = await aesEncrypt('secret', keyHex256, ivHex, 'CBC', 256, 'PKCS7')
    await expect(aesDecrypt(c, wrongKey, ivHex, 'CBC', 256, 'PKCS7')).rejects.toThrow(/Decryption failed/)
  })
  it('decrypt with wrong IV throws', async () => {
    const c = await aesEncrypt('secret', keyHex256, ivHex, 'CBC', 256, 'PKCS7')
    await expect(aesDecrypt(c, keyHex256, 'ffffffffffffffffffffffffffffffff', 'CBC', 256, 'PKCS7')).rejects.toThrow(/Decryption failed/)
  })
  it('reject short key', async () => {
    await expect(aesEncrypt('test', 'dead', ivHex, 'CBC', 256, 'PKCS7')).rejects.toThrow(/Key length/)
  })
  it('reject short IV for CBC', async () => {
    await expect(aesEncrypt('test', keyHex256, '0001', 'CBC', 256, 'PKCS7')).rejects.toThrow(/IV length/)
  })
  it('generateAesKey produces usable 256-bit key', async () => {
    const gk = await generateAesKey(256)
    expect(gk).toHaveLength(64)
    const c = await aesEncrypt('test', gk, ivHex, 'CBC', 256, 'PKCS7')
    expect(await aesDecrypt(c, gk, ivHex, 'CBC', 256, 'PKCS7')).toBe('test')
  })
})

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
    await expect(importRsaPublicKey('not a key', true)).rejects.toThrow(/Key format error/)
  })
  it('rejects empty string', async () => {
    await expect(importRsaPublicKey('', true)).rejects.toThrow(/Key format error/)
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
    await expect(importRsaPrivateKey(pub)).rejects.toThrow(/Key format error/)
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
    await expect(rsaDecrypt(c, k2.privateKey, 'OAEP-SHA256')).rejects.toThrow(/Decryption failed/)
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
