import { vi } from 'vitest'

vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  }
})

// jsdom's crypto.subtle.importKey may reject ArrayBuffer created in worker threads.
// Ensure all buffer-like arguments are backed by a fresh Uint8Array copy.
const _origImportKey = crypto.subtle.importKey.bind(crypto.subtle)
crypto.subtle.importKey = function (
  format: any,
  keyData: BufferSource,
  algorithm: AlgorithmIdentifier,
  extractable: boolean,
  keyUsages: KeyUsage[],
): Promise<CryptoKey> {
  if (keyData instanceof ArrayBuffer) {
    keyData = new Uint8Array(keyData)
  }
  return _origImportKey(format, keyData, algorithm, extractable, keyUsages)
} as typeof crypto.subtle.importKey
