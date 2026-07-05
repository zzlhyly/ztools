import { describe, it, expect } from 'vitest'
import { ipToUint32, formatIp, calculateCidr } from '../cidr'

describe('ipToUint32', () => {
  it('converts 192.168.1.1 to 3232235777', () => {
    expect(ipToUint32('192.168.1.1')).toBe(3232235777)
  })

  it('converts 0.0.0.0 to 0', () => {
    expect(ipToUint32('0.0.0.0')).toBe(0)
  })

  it('converts 255.255.255.255 to 4294967295', () => {
    expect(ipToUint32('255.255.255.255')).toBe(4294967295)
  })

  it('returns null for octet > 255', () => {
    expect(ipToUint32('256.1.1.1')).toBeNull()
  })

  it('returns null for too few octets', () => {
    expect(ipToUint32('1.2.3')).toBeNull()
  })
})

describe('formatIp', () => {
  it('formats 3232235777 as 192.168.1.1', () => {
    expect(formatIp(3232235777)).toBe('192.168.1.1')
  })
})

describe('calculateCidr', () => {
  it('calculates /24 correctly', () => {
    const result = calculateCidr('192.168.1.0', 24)
    expect(result).not.toBeNull()
    expect(result!.network).toBe('192.168.1.0')
    expect(result!.broadcast).toBe('192.168.1.255')
    expect(result!.totalHosts).toBe(254)
    expect(result!.subnetMask).toBe('255.255.255.0')
    expect(result!.wildcardMask).toBe('0.0.0.255')
  })

  it('calculates /8 correctly', () => {
    const result = calculateCidr('10.0.0.0', 8)
    expect(result).not.toBeNull()
    expect(result!.network).toBe('10.0.0.0')
    expect(result!.broadcast).toBe('10.255.255.255')
    expect(result!.totalHosts).toBe(16777214)
  })

  it('calculates /32 (single host)', () => {
    const result = calculateCidr('10.0.0.0', 32)
    expect(result).not.toBeNull()
    expect(result!.totalHosts).toBe(1)
    expect(result!.hostRange).toBe('10.0.0.0 — 10.0.0.0')
  })

  it('calculates /0 correctly', () => {
    const result = calculateCidr('10.0.0.0', 0)
    expect(result).not.toBeNull()
    expect(result!.network).toBe('0.0.0.0')
    expect(result!.broadcast).toBe('255.255.255.255')
  })

  it('returns null for invalid IP', () => {
    expect(calculateCidr('256.0.0.0', 24)).toBeNull()
  })

  it('returns null for prefix out of range', () => {
    expect(calculateCidr('10.0.0.0', -1)).toBeNull()
    expect(calculateCidr('10.0.0.0', 33)).toBeNull()
  })

  it('calculates /31 (RFC 3021: 2 hosts, no network/broadcast)', () => {
    const result = calculateCidr('10.0.0.0', 31)
    expect(result).not.toBeNull()
    expect(result!.totalHosts).toBe(2)
    expect(result!.hostRange).toBe('10.0.0.0 — 10.0.0.1')
  })
})
