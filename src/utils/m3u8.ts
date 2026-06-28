/**
 * Parse a cURL command string into URL and headers.
 * Returns null if the input is not a cURL command.
 */
export function parseCurlCommand(
  curlString: string,
): { url: string; headers: Record<string, string> } | null {
  const trimmed = curlString.trim()
  if (!trimmed.startsWith('curl ')) return null

  // Extract URL — matches the first unquoted, single-quoted, or double-quoted URL after "curl "
  const urlMatch = trimmed.match(
    /curl\s+(?:--\S+\s+)*(?:'([^']+)'|"([^"]+)"|(\S+))/,
  )
  if (!urlMatch) return null
  const url = urlMatch[1] || urlMatch[2] || urlMatch[3]
  if (!url || !url.startsWith('http')) return null

  // Extract headers (-H 'Key: Value' or --header 'Key: Value')
  const headers: Record<string, string> = {}
  const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)")/g
  let match: RegExpExecArray | null
  while ((match = headerRegex.exec(trimmed)) !== null) {
    const headerStr = match[1] || match[2]
    const colonIndex = headerStr.indexOf(':')
    if (colonIndex > 0) {
      const key = headerStr.substring(0, colonIndex).trim()
      const value = headerStr.substring(colonIndex + 1).trim()
      headers[key] = value
    }
  }

  return { url, headers }
}
