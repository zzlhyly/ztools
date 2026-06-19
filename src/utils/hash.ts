/**
 * 哈希计算工具（使用 Web Crypto API）
 */

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export async function calculateHash(input: string, algorithm: HashAlgorithm): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)

  const hashBuffer = await crypto.subtle.digest(algorithm, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

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