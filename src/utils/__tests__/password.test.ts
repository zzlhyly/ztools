import { describe, it, expect } from 'vitest'
import { calculateEntropy, getStrengthLabel, generatePassword } from '../password'

describe('calculateEntropy', () => {
  it('calculates entropy for 8 chars alphanumeric (~41.3 bits)', () => {
    const e = calculateEntropy(8, 36)
    expect(e).toBeGreaterThan(41)
    expect(e).toBeLessThan(42)
  })

  it('calculates entropy for 16 chars full set (~105.1 bits)', () => {
    const e = calculateEntropy(16, 95)
    expect(e).toBeGreaterThan(105)
    expect(e).toBeLessThan(106)
  })

  it('returns 0 for zero length', () => {
    expect(calculateEntropy(0, 36)).toBe(0)
  })

  it('returns 0 for zero charset', () => {
    expect(calculateEntropy(16, 0)).toBe(0)
  })
})

describe('getStrengthLabel', () => {
  it('labels < 40 as Very Weak', () => {
    expect(getStrengthLabel(30)).toBe('Very Weak')
  })

  it('labels 40-59 as Weak', () => {
    expect(getStrengthLabel(55)).toBe('Weak')
  })

  it('labels 60-79 as Fair', () => {
    expect(getStrengthLabel(75)).toBe('Fair')
  })

  it('labels 80-99 as Strong', () => {
    expect(getStrengthLabel(95)).toBe('Strong')
  })

  it('labels >= 100 as Very Strong', () => {
    expect(getStrengthLabel(120)).toBe('Very Strong')
  })
})

describe('generatePassword', () => {
  it('generates all uppercase when only upper enabled', () => {
    const pwd = generatePassword(16, { upper: true, lower: false, digits: false, symbols: false })
    expect(pwd).toHaveLength(16)
    expect(pwd).toMatch(/^[A-Z]+$/)
  })

  it('generates correct length with all charsets', () => {
    const pwd = generatePassword(32, { upper: true, lower: true, digits: true, symbols: true })
    expect(pwd).toHaveLength(32)
  })

  it('returns empty string when no charsets enabled', () => {
    const pwd = generatePassword(32, { upper: false, lower: false, digits: false, symbols: false })
    expect(pwd).toBe('')
  })
})
