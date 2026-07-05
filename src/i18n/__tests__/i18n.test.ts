import { describe, it, expect } from 'vitest'
import zhCN from '../zh-CN'
import enUS from '../en-US'

describe('i18n', () => {
  it('should have zh-CN translations', () => {
    expect(zhCN).toBeDefined()
    expect(zhCN.app.title).toBe('ztools')
    expect(zhCN.tools.json.name).toBe('JSON 格式化')
  })

  it('should have en-US translations', () => {
    expect(enUS).toBeDefined()
    expect(enUS.app.title).toBe('ztools')
    expect(enUS.tools.json.name).toBe('JSON Formatter')
  })

  it('should have same keys in both locales', () => {
    const getKeys = (obj: any, prefix = ''): string[] => {
      return Object.entries(obj).flatMap(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (typeof value === 'object' && value !== null) {
          return getKeys(value, fullKey)
        }
        return fullKey
      })
    }
    const zhKeys = getKeys(zhCN).sort()
    const enKeys = getKeys(enUS).sort()
    expect(zhKeys).toEqual(enKeys)
  })
})
