import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/rsa-crypto', component: {} as any }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      common: {
        input: 'Input',
        output: 'Output',
        format: 'Format',
        minify: 'Minify',
        encode: 'Encode',
        decode: 'Decode',
        copy: 'Copy',
        paste: 'Paste',
        clear: 'Clear',
        swap: 'Swap',
        convert: 'Convert',
        test: 'Test',
        calculate: 'Calculate',
        copied: 'Copied to clipboard',
        error: 'Error',
        success: 'Success',
        placeholder: 'Enter content...',
        selectFile: 'Select File',
        hashing: 'Computing...',
      },
      errors: {
        jsonSyntax: 'JSON syntax error: {message}',
        xmlSyntax: 'XML syntax error',
        invalidInput: 'Invalid input',
        unknown: 'Unknown error',
      },
    },
  },
})

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/utils/crypto', () => ({
  rsaEncrypt: vi.fn().mockResolvedValue('ZW5jcnlwdGVk'),
  rsaDecrypt: vi.fn().mockResolvedValue('decrypted text'),
  rsaSign: vi.fn().mockResolvedValue('c2lnbmVk'),
  rsaVerify: vi.fn().mockResolvedValue(true),
  getRsaMaxPayload: vi.fn().mockReturnValue(190),
  CryptoError: class CryptoError extends Error {
    name = 'CryptoError'
    constructor(m: string) { super(m) }
  },
  arrayBufferToHex: vi.fn().mockReturnValue('hex'),
  base64ToArrayBuffer: vi.fn().mockReturnValue(new ArrayBuffer(0)),
}))

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

describe('RsaCrypto', () => {
  const stubs = {
    'el-select': { template: '<div class="el-select"><slot /></div>' },
    'el-option': { template: '<div class="el-option"><slot /></div>' },
    'el-button': { template: '<button><slot /></button>' },
    'el-input': { template: '<div class="el-input"><textarea /><slot /></div>' },
  }

  it('should render textarea', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n], stubs },
    })
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should render encrypt padding, sign padding, and output format dropdowns', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n], stubs },
    })
    const selects = wrapper.findAll('.el-select')
    expect(selects.length).toBe(3)
    const options = wrapper.findAll('.el-option')
    expect(options.length).toBe(9) // 4 encrypt + 3 sign + 2 output
  })

  it('should render 5 operation buttons', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n], stubs },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().includes('Encrypt')).length).toBe(1)
    expect(buttons.filter(b => b.text().includes('Decrypt')).length).toBe(1)
    expect(buttons.filter(b => b.text().includes('Sign')).length).toBe(1)
    expect(buttons.filter(b => b.text().includes('Verify')).length).toBe(1)
    expect(buttons.filter(b => b.text().includes('Clear')).length).toBe(1)
  })

  it('should render key input fields', async () => {
    const RsaCrypto = await import('../RsaCrypto.vue')
    const wrapper = mount(RsaCrypto.default, {
      global: { plugins: [router, i18n], stubs },
    })
    const inputs = wrapper.findAll('.el-input')
    expect(inputs.length).toBe(2)
  })
})
