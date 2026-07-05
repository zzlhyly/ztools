import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('App Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should have default theme as system', () => {
    const store = useAppStore()
    expect(store.theme).toBe('system')
  })

  it('should set theme and persist to localStorage', async () => {
    const store = useAppStore()
    store.setTheme('dark')
    expect(store.theme).toBe('dark')
    await nextTick()
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
  })

  it('should toggle sidebar', () => {
    const store = useAppStore()
    expect(store.sidebarCollapsed).toBe(false)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(true)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('should add recent tool and persist', () => {
    const store = useAppStore()
    store.addRecentTool('/json')
    expect(store.recentTools).toEqual(['/json'])
    expect(localStorageMock.setItem).toHaveBeenCalledWith('recentTools', JSON.stringify(['/json']))
  })

  it('should limit recent tools to 10', () => {
    const store = useAppStore()
    for (let i = 0; i < 15; i++) {
      store.addRecentTool(`/tool-${i}`)
    }
    expect(store.recentTools).toHaveLength(10)
    expect(store.recentTools[0]).toBe('/tool-14')
  })

  it('should not duplicate recent tools', () => {
    const store = useAppStore()
    store.addRecentTool('/json')
    store.addRecentTool('/xml')
    store.addRecentTool('/json')
    expect(store.recentTools).toEqual(['/json', '/xml'])
  })

  it('should compute isDark correctly for system theme', () => {
    const store = useAppStore()
    expect(store.isDark).toBe(false)
  })

  it('should compute isDark correctly for dark theme', () => {
    const store = useAppStore()
    store.setTheme('dark')
    expect(store.isDark).toBe(true)
  })

  it('should compute isDark correctly for light theme', () => {
    const store = useAppStore()
    store.setTheme('light')
    expect(store.isDark).toBe(false)
  })

  it('should persist and retrieve tool inputs', () => {
    const store = useAppStore()
    store.saveToolInput('/json', '{"key":"value"}')
    expect(store.toolInputs['/json']).toBe('{"key":"value"}')
    expect(store.getToolInput('/json')).toBe('{"key":"value"}')
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'toolInputs',
      JSON.stringify({ '/json': '{"key":"value"}' }),
    )
  })

  it('should return empty string for unknown tool input', () => {
    const store = useAppStore()
    expect(store.getToolInput('/unknown')).toBe('')
  })

  it('should clear tool input when set to empty string', () => {
    const store = useAppStore()
    store.saveToolInput('/json', 'test')
    store.saveToolInput('/json', '')
    expect(store.getToolInput('/json')).toBe('')
  })
})
