import type { Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { copyToClipboard } from '@/utils/clipboard'

/**
 * Shared composable for clipboard copy with success notification.
 * Replaces the duplicated `handleCopy` function in tool components.
 *
 * Usage:
 *   const handleCopy = useClipboard(output)
 */
export function useClipboard(source: Ref<string>) {
  const { t } = useI18n()
  return async () => {
    if (source.value) {
      await copyToClipboard(source.value)
      ElMessage.success(t('common.copied'))
    }
  }
}
