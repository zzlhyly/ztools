export function ipToUint32(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let result = 0
  for (const part of parts) {
    const oct = parseInt(part, 10)
    if (isNaN(oct) || oct < 0 || oct > 255) return null
    result = (result << 8) + oct
  }
  return result >>> 0
}

export function formatIp(v: number): string {
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff].join('.')
}

export interface CidrResult {
  network: string
  broadcast: string
  hostRange: string
  totalHosts: number
  subnetMask: string
  wildcardMask: string
}

export function calculateCidr(ip: string, prefix: number): CidrResult | null {
  const ipNum = ipToUint32(ip)
  if (ipNum === null || prefix < 0 || prefix > 32 || isNaN(prefix)) return null

  const hostBits = 32 - prefix
  const mask = prefix === 0 ? 0 : ~((1 << hostBits) - 1) >>> 0
  const network = ipNum & mask
  const broadcast = prefix === 32 ? ipNum : (network | (~mask >>> 0)) >>> 0
  const total = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.pow(2, hostBits) - 2
  const firstHost = prefix >= 31 ? network : network + 1
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1

  return {
    network: formatIp(network),
    broadcast: formatIp(broadcast),
    hostRange: `${formatIp(firstHost)} — ${formatIp(lastHost)}`,
    totalHosts: total,
    subnetMask: formatIp(mask),
    wildcardMask: formatIp(~mask >>> 0),
  }
}
