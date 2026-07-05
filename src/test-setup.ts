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

// Node 20's crypto.subtle in a vitest worker thread may reject ArrayBuffer
// objects created in the main thread via structured-clone transfer semantics.
// Wrap all crypto.subtle methods to normalize buffer arguments.
{
  type AnyFn = (...args: any[]) => any
  const wrap = (_name: string, fn: AnyFn): AnyFn => {
    return function (this: any, ...args: any[]) {
      for (let i = 0; i < args.length; i++) {
        if (args[i] instanceof ArrayBuffer) {
          args[i] = new Uint8Array(args[i])
        }
        // Deep-check algorithm objects (may be at any position: importKey algo,
        // encrypt/decrypt algo, generateKey algo, etc.)
        if (i === 0 && typeof args[i] === 'object' && args[i] !== null) {
          const algo = { ...args[i] }
          let changed = false
          for (const k of ['iv', 'counter', 'salt', 'additionalData']) {
            if (algo[k] instanceof ArrayBuffer) {
              algo[k] = new Uint8Array(algo[k])
              changed = true
            }
          }
          if (changed) args[i] = algo
        }
      }
      return fn.apply(this, args)
    }
  }

  const subtle = crypto.subtle
  ;(subtle as any).importKey = wrap('importKey', subtle.importKey.bind(subtle))
  ;(subtle as any).encrypt = wrap('encrypt', subtle.encrypt.bind(subtle))
  ;(subtle as any).decrypt = wrap('decrypt', subtle.decrypt.bind(subtle))
  ;(subtle as any).sign = wrap('sign', subtle.sign.bind(subtle))
  ;(subtle as any).verify = wrap('verify', subtle.verify.bind(subtle))
  ;(subtle as any).generateKey = wrap('generateKey', subtle.generateKey.bind(subtle))
  ;(subtle as any).exportKey = wrap('exportKey', subtle.exportKey.bind(subtle))
}
