import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/rsa-key-gen', component: {} as any }],
})

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': {
      tools: {
        hmac: { name: 'HMAC Calculator' },
      },
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
  },
}))

vi.mock('@/utils/crypto', () => ({
  generateRsaKeyPair: vi.fn().mockResolvedValue({
    publicKey: '-----BEGIN PUBLIC KEY-----\nMOCKPUBLIC\n-----END PUBLIC KEY-----',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMOCKPRIVATE\n-----END PRIVATE KEY-----',
  }),
  arrayBufferToHex: vi.fn().mockReturnValue('deadbeef'),
  base64ToArrayBuffer: vi.fn().mockReturnValue(new ArrayBuffer(0)),
  CryptoError: class CryptoError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'CryptoError'
    }
  },
}))

describe('RsaKeyGen', () => {
  const stubs = {
    'el-select': { template: '<div class="el-select"><slot /></div>' },
    'el-option': { template: '<div class="el-option"><slot /></div>' },
    'el-button': { template: '<button><slot /></button>' },
  }

  it('should render key size dropdown with 3 options', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n], stubs },
    })
    const selects = wrapper.findAll('.el-select')
    expect(selects.length).toBeGreaterThanOrEqual(1)
    const options = wrapper.findAll('.el-option')
    expect(options.length).toBe(5) // 3 key sizes + 2 formats
  })

  it('should render generate button', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n], stubs },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.filter(b => b.text().toLowerCase().includes('generate')).length).toBe(1)
  })

  it('should render two key output panels', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n], stubs },
    })
    const panels = wrapper.findAll('.key-panel')
    expect(panels.length).toBe(2)
  })

  it('should have private key panel with warning class', async () => {
    const RsaKeyGen = await import('../RsaKeyGen.vue')
    const wrapper = mount(RsaKeyGen.default, {
      global: { plugins: [router, i18n], stubs },
    })
    const panels = wrapper.findAll('.key-panel')
    expect(panels[1].classes()).toContain('private-key-panel')
  })
})
