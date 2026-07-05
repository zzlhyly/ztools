<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { diffLines } from 'diff'
import { useAppStore } from '@/stores/app'
import ToolLayout from '@/components/ToolLayout.vue'
import { GitCompare, Trash2, ArrowLeftRight, Columns2, FileText } from 'lucide-vue-next'

const { t } = useI18n()
const appStore = useAppStore()

const textA = ref('')
const textB = ref('')
const showUnified = ref(false)

interface DiffBlock {
  type: 'unchanged' | 'modified' | 'removed' | 'added'
  leftLines: string[]
  rightLines: string[]
}
const diffBlocks = ref<DiffBlock[]>([])
const hasDiff = ref(false)

// Tool input memory
onMounted(() => {
  textA.value = appStore.getToolInput('/diff/textA')
  textB.value = appStore.getToolInput('/diff/textB')
})

const persistInputs = () => {
  appStore.saveToolInput('/diff/textA', textA.value)
  appStore.saveToolInput('/diff/textB', textB.value)
}

const handleCompare = () => {
  if (!textA.value && !textB.value) return
  persistInputs()

  const changes = diffLines(textA.value, textB.value)
  const blocks: DiffBlock[] = []

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]
    const val = change.value
    // Remove trailing newline for display, add it back per-line
    const lines = val.endsWith('\n') ? val.slice(0, -1).split('\n') : val.split('\n')

    if (!change.added && !change.removed) {
      blocks.push({ type: 'unchanged', leftLines: lines, rightLines: [...lines] })
    } else if (change.removed) {
      const next = changes[i + 1]
      if (next?.added) {
        blocks.push({
          type: 'modified',
          leftLines: lines,
          rightLines: next.value.endsWith('\n')
            ? next.value.slice(0, -1).split('\n')
            : next.value.split('\n'),
        })
        i++ // skip the next
      } else {
        blocks.push({ type: 'removed', leftLines: lines, rightLines: [] })
      }
    } else if (change.added) {
      blocks.push({ type: 'added', leftLines: [], rightLines: lines })
    }
  }

  diffBlocks.value = blocks
  hasDiff.value = true
}

const handleClear = () => {
  textA.value = ''
  textB.value = ''
  diffBlocks.value = []
  hasDiff.value = false
  persistInputs()
}

const handleSwap = () => {
  const tmp = textA.value
  textA.value = textB.value
  textB.value = tmp
}

// Unified diff string
const unifiedDiff = ref('')

const buildUnifiedDiff = () => {
  if (!hasDiff.value) return ''
  const changes = diffLines(textA.value, textB.value)
  let lineA = 1
  let lineB = 1
  const hunks: string[] = []
  let hunkLines: string[] = []
  let hunkStartA = 0
  let hunkStartB = 0

  const flushHunk = () => {
    if (hunkLines.length === 0) return
    hunks.push(
      `@@ -${hunkStartA},${lineA - hunkStartA} +${hunkStartB},${lineB - hunkStartB} @@`,
      ...hunkLines,
    )
    hunkLines = []
  }

  // Reset tracker per-build
  for (const change of changes) {
    const count =
      change.count ??
      (change.value.endsWith('\n')
        ? change.value.split('\n').length - 1
        : change.value.split('\n').length)
    const lines = change.value.split('\n').filter((l) => l !== '')

    if (!change.added && !change.removed) {
      // context — start hunk if first context in a while
      if (hunkLines.length === 0) {
        hunkStartA = lineA
        hunkStartB = lineB
      }
      hunkLines.push(...lines.map((l) => ` ${l}`))
      lineA += count
      lineB += count
    } else if (change.removed) {
      if (hunkLines.length === 0) {
        hunkStartA = lineA
        hunkStartB = lineB
      }
      hunkLines.push(...lines.map((l) => `-${l}`))
      lineA += count
    } else if (change.added) {
      if (hunkLines.length === 0) {
        hunkStartA = lineA
        hunkStartB = lineB
      }
      hunkLines.push(...lines.map((l) => `+${l}`))
      lineB += count
    }
  }
  flushHunk()
  unifiedDiff.value = hunks.join('\n')
}

// Rebuild unified when switching view
const toggleView = () => {
  showUnified.value = !showUnified.value
  if (showUnified.value && hasDiff.value) {
    buildUnifiedDiff()
  }
}
</script>

<template>
  <ToolLayout :title="t('tools.diff.name')" :layout="'stacked'">
    <template #input-actions>
      <el-button type="primary" :icon="GitCompare" @click="handleCompare">
        {{ t('common.compare') }}
      </el-button>
      <el-button :icon="ArrowLeftRight" @click="handleSwap">
        {{ t('common.swap') }}
      </el-button>
      <el-button :icon="Trash2" @click="handleClear">
        {{ t('common.clear') }}
      </el-button>
      <el-button v-if="hasDiff" :icon="showUnified ? Columns2 : FileText" @click="toggleView">
        {{ showUnified ? t('common.compare') : 'Unified' }}
        <!-- ponytail: toggle label is small, no i18n needed -->
      </el-button>
    </template>

    <template #input>
      <div class="diff-inputs">
        <div class="diff-textarea-wrapper">
          <label class="diff-label">Text A</label>
          <textarea
            v-model="textA"
            class="tool-textarea diff-textarea"
            placeholder="Enter text A..."
            @input="persistInputs"
          />
        </div>
        <div class="diff-textarea-wrapper">
          <label class="diff-label">Text B</label>
          <textarea
            v-model="textB"
            class="tool-textarea diff-textarea"
            placeholder="Enter text B..."
            @input="persistInputs"
          />
        </div>
      </div>
    </template>

    <template #output>
      <div v-if="!hasDiff" class="empty-state">
        {{ t('common.output') }}
      </div>
      <div v-else-if="showUnified" class="diff-unified">
        <pre class="diff-pre">{{ unifiedDiff }}</pre>
      </div>
      <div v-else class="diff-side-by-side">
        <div class="diff-side-column">
          <div
            v-for="(block, i) in diffBlocks"
            :key="'l-' + i"
            class="diff-line-group"
            :class="block.type"
          >
            <div v-for="(line, j) in block.leftLines" :key="'l-' + i + '-' + j" class="diff-line">
              {{ line || ' ' }}
            </div>
          </div>
        </div>
        <div class="diff-side-column">
          <div
            v-for="(block, i) in diffBlocks"
            :key="'r-' + i"
            class="diff-line-group"
            :class="block.type"
          >
            <div v-for="(line, j) in block.rightLines" :key="'r-' + i + '-' + j" class="diff-line">
              {{ line || ' ' }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.diff-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  flex: 1;
  min-height: 0;
}

.diff-textarea-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.diff-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.diff-textarea {
  flex: 1;
  min-height: 200px;
  resize: vertical;
}

.diff-side-by-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.diff-side-column {
  overflow: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
}

.diff-line-group.unchanged {
  color: var(--text-color-primary, #303133);
}

.diff-line-group.removed,
.diff-line-group.modified .diff-line:first-child {
  background-color: rgba(255, 100, 100, 0.15);
  color: #c41e3a;
  text-decoration: line-through;
}

.diff-line-group.added,
.diff-line-group.modified .diff-line:last-child {
  background-color: rgba(100, 200, 100, 0.15);
  color: #1a7a3a;
}

.diff-line-group.removed .diff-line,
.diff-line-group.added .diff-line {
  text-decoration: none;
}

.diff-line {
  padding: 1px var(--spacing-sm);
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-unified {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.diff-pre {
  margin: 0;
  padding: var(--spacing-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  color: var(--text-color-placeholder);
  font-size: var(--font-size-sm);
}

/* ToolTextarea style reuse */
.tool-textarea {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-size-md);
  line-height: 1.6;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color-primary);
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.tool-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.tool-textarea::placeholder {
  color: var(--text-color-placeholder);
}
</style>
