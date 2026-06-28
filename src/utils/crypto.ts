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
