<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ToolPanel from './ToolPanel.vue'
import ToolActionBar from './ToolActionBar.vue'

type LayoutMode = 'split' | 'stacked' | 'auto'

interface Props {
  title: string
  inputLabel?: string
  outputLabel?: string
  outputCopyable?: boolean
  layout?: LayoutMode
}

const props = withDefaults(defineProps<Props>(), {
  inputLabel: '',
  outputLabel: '',
  outputCopyable: false,
  layout: 'stacked',
})

const emit = defineEmits<{
  copy: []
}>()

const { t } = useI18n()
const containerRef = ref<HTMLDivElement | null>(null)
const containerWidth = ref(1200)

const isStacked = computed(() => {
  if (props.layout === 'stacked') return true
  if (props.layout === 'split') return false
  return containerWidth.value < 900
})

const updateWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
  }
}

onMounted(() => {
  updateWidth()
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<template>
  <div ref="containerRef" class="tool-layout">
    <h2 class="tool-title">{{ title }}</h2>

    <div class="tool-workspace" :class="{ stacked: isStacked }">
      <ToolPanel :title="inputLabel || t('common.input')">
        <template #actions>
          <slot name="input-actions" />
        </template>
        <slot name="input" />
      </ToolPanel>

      <ToolPanel
        :title="outputLabel || t('common.output')"
        :copyable="outputCopyable"
        @copy="emit('copy')"
      >
        <template #actions>
          <slot name="output-actions" />
          <ToolActionBar>
            <slot name="actions" />
          </ToolActionBar>
        </template>
        <slot name="output" />
      </ToolPanel>
    </div>
  </div>
</template>

<style scoped>
.tool-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.tool-title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--text-title);
  margin: 0;
}

.tool-workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
  gap: var(--spacing-md);
  min-height: 0;
}

.tool-workspace.stacked {
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
}

.tool-workspace > * {
  min-height: 0;
}
</style>
