import { describe, it, expect } from 'vitest'
import router from '../index'

describe('Router', () => {
  it('should have routes for all tools', () => {
    const routePaths = router.options.routes.map(r => r.path)
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
  })

  it('should redirect root to /json', () => {
    const rootRoute = router.options.routes.find(r => r.path === '/')
    expect(rootRoute?.redirect).toBe('/json')
  })

  it('should have 10 routes total', () => {
    expect(router.options.routes).toHaveLength(10)
  })
})
