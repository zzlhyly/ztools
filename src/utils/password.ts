export function calculateEntropy(length: number, charsetSize: number): number {
  if (length <= 0 || charsetSize <= 0) return 0
  return Math.log2(Math.pow(charsetSize, length))
}

export function getStrengthLabel(bits: number): string {
  if (bits < 40) return 'Very Weak'
  if (bits < 60) return 'Weak'
  if (bits < 80) return 'Fair'
  if (bits < 100) return 'Strong'
  return 'Very Strong'
}

export function generatePassword(
  length: number,
  charsets: { upper: boolean; lower: boolean; digits: boolean; symbols: boolean },
): string {
  let chars = ''
  if (charsets.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (charsets.lower) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (charsets.digits) chars += '0123456789'
  if (charsets.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (chars.length === 0) return ''

  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length]
  }
  return password
}
