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

/**
 * Detect if a string is HEX, Base64, or plain text.
 * Priority: even-length all-hex strings (including short ones like 'abcd') → hex;
 * strings matching base64 charset with uppercase/digit/special → base64;
 * everything else → text.
 * Note: short lowercase-only hex strings ('cafe', 'beef') are classified as hex,
 * not base64. Callers should not rely on this function to distinguish
 * short hex from short base64.
 */
export function detectKeyFormat(input: string): 'hex' | 'base64' | 'text' {
  if (input.length === 0) return 'text'
  if (input.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(input)) {
    return 'hex'
  }
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(input) && input.length >= 4) {
    if (/[A-Z0-9+/=]/.test(input)) return 'base64'
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
  // Validate IV
  if (ivHex.length !== 32) {
    throw new CryptoError(`IV length error: expected 16 bytes, got ${ivHex.length/2}`)
  }
  const ivBuf = hexToArrayBuffer(ivHex)
  // Build algorithm params
  const algoParams: any = { name: `AES-${mode}` }
  if (mode === 'CTR') {
    algoParams.counter = ivBuf
    algoParams.length = 64
  } else if (mode === 'GCM') {
    algoParams.iv = ivBuf
    algoParams.tagLength = 128
  } else {
    algoParams.iv = ivBuf
  }
  // Import key
  const key = await crypto.subtle.importKey('raw', keyBytes, algoParams.name, false, ['encrypt'])
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
  let ivBuf: ArrayBuffer
  if (ivHex.length !== 32) {
    throw new CryptoError(`IV length error: expected 16 bytes, got ${ivHex.length/2}`)
  }
  ivBuf = hexToArrayBuffer(ivHex)
  const algoParams: any = { name: `AES-${mode}` }
  if (mode === 'CTR') {
    algoParams.counter = ivBuf
    algoParams.length = 64
  } else if (mode === 'GCM') {
    algoParams.iv = ivBuf
    algoParams.tagLength = 128
  } else {
    algoParams.iv = ivBuf
  }
  const key = await crypto.subtle.importKey('raw', keyBytes, algoParams.name, false, ['decrypt'])
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
    throw new CryptoError(`Decryption failed: key/IV mismatch or corrupted data`)
  }
}

// ============================================================
// RSA
// ============================================================

const PEM_PUBLIC_HEADER = '-----BEGIN PUBLIC KEY-----'
const PEM_PUBLIC_FOOTER = '-----END PUBLIC KEY-----'
const PEM_PRIVATE_HEADER = '-----BEGIN PRIVATE KEY-----'
const PEM_PRIVATE_FOOTER = '-----END PRIVATE KEY-----'
// ponytail: pkcs1 format not supported by Web Crypto API; modern tools produce pkcs8

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
  const der = validatePem(pem, PEM_PRIVATE_HEADER, PEM_PRIVATE_FOOTER)
  try {
    return await crypto.subtle.importKey('pkcs8', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt'])
  } catch { throw new CryptoError('Key import failed: invalid private key') }
}

export function getRsaMaxPayload(modulusLength: number, padding: string): number {
  const keyBytes = modulusLength / 8
  if (padding === 'PKCS#1 v1.5') return keyBytes - 11
  const hashBytes = padding.includes('SHA-512') ? 64 : padding.includes('SHA-256') ? 32 : padding.includes('SHA-1') ? 20 : 32
  return keyBytes - 2 * hashBytes - 2
}
