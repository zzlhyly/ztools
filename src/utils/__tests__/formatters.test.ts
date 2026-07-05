import { describe, it, expect } from 'vitest'
import {
  formatJson,
  minifyJson,
  validateJson,
  formatXml,
  validateXml,
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
} from '../formatters'

describe('JSON Formatter', () => {
  it('should format JSON with indentation', () => {
    const input = '{"name":"test","age":18}'
    const expected = '{\n  "name": "test",\n  "age": 18\n}'
    expect(formatJson(input)).toBe(expected)
  })

  it('should minify JSON', () => {
    const input = '{\n  "name": "test",\n  "age": 18\n}'
    const expected = '{"name":"test","age":18}'
    expect(minifyJson(input)).toBe(expected)
  })

  it('should validate valid JSON', () => {
    expect(validateJson('{"name":"test"}')).toBe(true)
  })

  it('should invalidate invalid JSON', () => {
    expect(validateJson('{invalid}')).toBe(false)
  })

  it('should throw error for invalid JSON format', () => {
    expect(() => formatJson('{invalid}')).toThrow()
  })
})

describe('XML Formatter', () => {
  it('should format XML', () => {
    const input = '<root><item>test</item></root>'
    const result = formatXml(input)
    expect(result).toContain('<root>')
    expect(result).toContain('<item>')
    expect(result).toContain('test')
  })

  it('should validate valid XML', () => {
    expect(validateXml('<root><item>test</item></root>')).toBe(true)
  })

  it('should invalidate invalid XML', () => {
    expect(validateXml('<root><item>test</root>')).toBe(false)
  })
})

describe('Base64 Encoder/Decoder', () => {
  it('should encode ASCII text', () => {
    expect(base64Encode('hello')).toBe('aGVsbG8=')
  })

  it('should decode ASCII text', () => {
    expect(base64Decode('aGVsbG8=')).toBe('hello')
  })

  it('should encode UTF-8 text', () => {
    const encoded = base64Encode('你好世界')
    expect(encoded).toBeTruthy()
    expect(base64Decode(encoded)).toBe('你好世界')
  })

  it('should handle empty string', () => {
    expect(base64Encode('')).toBe('')
    expect(base64Decode('')).toBe('')
  })
})

describe('URL Encoder/Decoder', () => {
  it('should encode URL special characters', () => {
    expect(urlEncode('hello world')).toBe('hello%20world')
    expect(urlEncode('foo&bar=baz')).toBe('foo%26bar%3Dbaz')
  })

  it('should decode URL encoded string', () => {
    expect(urlDecode('hello%20world')).toBe('hello world')
    expect(urlDecode('foo%26bar%3Dbaz')).toBe('foo&bar=baz')
  })

  it('should handle Chinese characters', () => {
    const encoded = urlEncode('你好')
    expect(encoded).toBe('%E4%BD%A0%E5%A5%BD')
    expect(urlDecode(encoded)).toBe('你好')
  })
})
