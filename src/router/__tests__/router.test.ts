import { describe, it, expect } from 'vitest'
import router from '../index'

describe('Router', () => {
  it('should have routes for all tools', () => {
    const routePaths = router.options.routes.map((r) => r.path)
    expect(routePaths).toContain('/')
    expect(routePaths).toContain('/json')
    expect(routePaths).toContain('/xml')
    expect(routePaths).toContain('/base64')
    expect(routePaths).toContain('/url')
    expect(routePaths).toContain('/timestamp')
    expect(routePaths).toContain('/regex')
    expect(routePaths).toContain('/color')
    expect(routePaths).toContain('/hash')
    expect(routePaths).toContain('/m3u8')
    expect(routePaths).toContain('/aes')
    expect(routePaths).toContain('/yaml')
    expect(routePaths).toContain('/sql')
    expect(routePaths).toContain('/qrcode')
    expect(routePaths).toContain('/diff')
    expect(routePaths).toContain('/ed25519')
    expect(routePaths).toContain('/password')
    expect(routePaths).toContain('/cidr')
    expect(routePaths).toContain('/jwt')
    expect(routePaths).toContain('/image')
    expect(routePaths).toContain('/encoding')
  })

  it('should redirect root to /json', () => {
    const rootRoute = router.options.routes.find((r) => r.path === '/')
    expect(rootRoute?.redirect).toBe('/json')
  })

  it('should have 26 routes total', () => {
    expect(router.options.routes).toHaveLength(26)
  })
})
