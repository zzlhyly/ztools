export interface JwtParts {
  header: object
  payload: object
  signature: string
}

export function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  try {
    return decodeURIComponent(
      atob(str)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
  } catch {
    return atob(str)
  }
}

export function parseJwt(token: string): JwtParts | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const headerRaw = base64urlDecode(parts[0])
    const payloadRaw = base64urlDecode(parts[1])
    return {
      header: JSON.parse(headerRaw),
      payload: JSON.parse(payloadRaw),
      signature: parts[2],
    }
  } catch {
    return null
  }
}

export function isExpired(payload: { exp?: number }): boolean {
  if (payload.exp === undefined) return false
  return payload.exp * 1000 < Date.now()
}
