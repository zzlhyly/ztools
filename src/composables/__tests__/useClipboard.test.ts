import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useClipboard } from '@/composables/useClipboard'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/utils/clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

describe('useClipboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should copy non-empty content', async () => {
    const source = ref('hello world')
    const copy = useClipboard(source)
    await copy()
    const { copyToClipboard } = await import('@/utils/clipboard')
    expect(copyToClipboard).toHaveBeenCalledWith('hello world')
  })

  it('should not copy empty content', async () => {
    const source = ref('')
    const copy = useClipboard(source)
    await copy()
    const { copyToClipboard } = await import('@/utils/clipboard')
    expect(copyToClipboard).not.toHaveBeenCalled()
  })
})
