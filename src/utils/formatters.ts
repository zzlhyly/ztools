/**
 * JSON 格式化工具
 */

export function formatJson(input: string): string {
  const parsed = JSON.parse(input)
  return JSON.stringify(parsed, null, 2)
}

export function minifyJson(input: string): string {
  const parsed = JSON.parse(input)
  return JSON.stringify(parsed)
}

export function validateJson(input: string): boolean {
  try {
    JSON.parse(input)
    return true
  } catch {
    return false
  }
}

/**
 * XML 格式化工具
 */

export function formatXml(input: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(input, 'text/xml')

  const errorNode = doc.querySelector('parsererror')
  if (errorNode) {
    throw new Error('Invalid XML')
  }

  const serializer = new XMLSerializer()
  const xmlStr = serializer.serializeToString(doc)

  // Simple formatting using array join for better performance
  const parts: string[] = []
  let indent = 0
  const lines = xmlStr.replace(/>\s*</g, '><').split('<')

  lines.forEach((line) => {
    if (line.startsWith('/')) {
      indent--
    }
    parts.push('  '.repeat(Math.max(0, indent)) + '<' + line)
    if (!line.startsWith('/') && !line.endsWith('/')) {
      indent++
    }
  })

  return parts.join('\n').trim()
}

export function validateXml(input: string): boolean {
  const parser = new DOMParser()
  const doc = parser.parseFromString(input, 'text/xml')
  return !doc.querySelector('parsererror')
}

/**
 * Base64 编解码工具（支持 UTF-8）
 */

export function base64Encode(input: string): string {
  if (!input) return ''
  const bytes = new TextEncoder().encode(input)
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return btoa(binary)
}

export function base64Decode(input: string): string {
  if (!input) return ''
  const binary = atob(input)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * URL 编解码工具
 */

export function urlEncode(input: string): string {
  return encodeURIComponent(input)
}

export function urlDecode(input: string): string {
  return decodeURIComponent(input)
}