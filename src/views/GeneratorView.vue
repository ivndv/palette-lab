<script setup lang="ts">
// Generador: conecta el store, la IA, el copiado y la exportación

// Pinia
import { storeToRefs } from 'pinia'
// Vue
import { computed, ref } from 'vue'
// i18n
import { useI18n } from 'vue-i18n'
// Router
import { useRoute } from 'vue-router'
// Adaptadores
import { download } from '@/adapters/browser/download'
// Aplicación
import { interpretPrompt } from '@/application/interpret-prompt'
// Componentes
import AiPrompt from '@/components/palette/AiPrompt.vue'
import ExportPanel from '@/components/palette/ExportPanel.vue'
import PaletteActions from '@/components/palette/PaletteActions.vue'
import PaletteGrid from '@/components/palette/PaletteGrid.vue'
import PaletteToolbar from '@/components/palette/PaletteToolbar.vue'
import SavePalettePanel from '@/components/palette/SavePalettePanel.vue'
// Composables
import { useClipboard } from '@/composables/useClipboard'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { getContainer } from '@/composition/container'
// Dominio
import type { InterpretedPalette } from '@/lib/ai'
import type { Hex } from '@/lib/color'
import { createExportFormats, type ExportFormat } from '@/lib/export'
import type { PaletteState } from '@/lib/palette'
import { PRESETS } from '@/lib/presets'
import { parseSharedPalette } from '@/lib/share'
// Stores
import { usePaletteStore } from '@/stores/palette'

const { t } = useI18n()
const paletteStore = usePaletteStore()
const {
  base,
  sourceBase,
  mode,
  tone,
  swatches,
  selectedPresetId,
  canRegenerate,
  canUndo,
  canRedo,
  lockedGeneratedCount,
} = storeToRefs(paletteStore)
const {
  setBase,
  setMode,
  setTone,
  regenerate,
  undo,
  redo,
  toggleLock,
  unlockAll,
  applyPreset,
  randomizeBase,
  applyInterpretation,
} = paletteStore

const route = useRoute()

// Una URL compartida se aplica antes de mostrar la paleta
const sharedPalette = parseSharedPalette(route.query)

if (sharedPalette) {
  paletteStore.applySharedPalette(sharedPalette)
}

const { copiedId, copy } = useClipboard()

// Estado de la interpretación
const aiLoading = ref(false)
const aiError = ref<string | null>(null)
const aiResult = ref<InterpretedPalette | null>(null)
const aiExamples = computed(() => [
  t('ai.examples.coffee'),
  t('ai.examples.sunset'),
  t('ai.examples.cyberpunk'),
  t('ai.examples.minimal'),
])

// Estado derivado para exportar
const paletteState = computed<PaletteState>(() => ({
  version: 3,
  base: base.value,
  sourceBase: sourceBase.value,
  mode: mode.value,
  tone: tone.value,
  swatches: swatches.value,
}))
const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
const exportFormats = computed(() => createExportFormats(paletteState.value, origin))
const copiedHex = computed<Hex | null>(() => {
  const value = copiedId.value
  return value?.startsWith('#') ? (value as Hex) : null
})

// Anuncio para lectores de pantalla: distingue color y formato
const copyAnnouncement = computed(() => {
  const value = copiedId.value

  if (!value) {
    return ''
  }

  const format = exportFormats.value.find((item) => item.id === value)

  if (format) {
    return format.id === 'url'
      ? t('generator.copiedUrl')
      : t('generator.copiedFormat', { label: format.label })
  }

  return t('generator.copiedHex', { hex: value })
})

useKeyboardShortcuts({
  regenerate,
  undo,
  redo,
  randomize: randomizeBase,
})

function onCopy(hex: Hex): void {
  void copy(hex, hex)
}

function onCopyFormat(format: ExportFormat): void {
  void copy(format.content, format.id)
}

function onDownloadFormat(format: ExportFormat): void {
  if (format.filename && format.mime) {
    download(format.filename, format.content, format.mime)
  }
}

function aiMessage(error: unknown): string {
  const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined

  if (code) {
    return t(`ai.errors.${code}`)
  }

  return error instanceof Error && error.message ? error.message : t('generator.aiGenericError')
}

// La IA solo elige base, armonía y tono; los colores los genera el dominio
async function onInterpret(prompt: string): Promise<void> {
  if (aiLoading.value) {
    return
  }

  aiLoading.value = true
  aiError.value = null
  aiResult.value = null

  try {
    const parsed = await interpretPrompt(getContainer().interpreter, prompt)
    const applied = applyInterpretation({
      base: parsed.base,
      mode: parsed.mode,
      tone: parsed.tone,
      seed: parsed.seed,
    })

    if (!applied) {
      throw new Error(t('generator.aiApplyError'))
    }

    aiResult.value = parsed
  } catch (error) {
    aiError.value = aiMessage(error)
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <div class="generator">
    <header class="page-heading">
      <p class="page-heading__eyebrow">{{ t('generator.eyebrow') }}</p>
      <h1>{{ t('generator.title') }}</h1>
      <p>{{ t('generator.lead') }}</p>
    </header>

    <div class="workspace">
      <aside class="workspace__controls" :aria-label="t('generator.controlsAria')">
        <PaletteToolbar
          :base="sourceBase"
          :applied-base="base"
          :mode="mode"
          :tone="tone"
          :can-regenerate="canRegenerate"
          :can-undo="canUndo"
          :locked-count="lockedGeneratedCount"
          :presets="PRESETS"
          :selected-preset-id="selectedPresetId"
          :show-actions="false"
          @update:base="setBase"
          @update:mode="setMode"
          @update:tone="setTone"
          @regenerate="regenerate"
          @undo="undo"
          @randomize="randomizeBase"
          @apply-preset="applyPreset"
        />
      </aside>

      <section class="workspace__palette" aria-labelledby="palette-title">
        <div class="section-heading">
          <div>
            <p class="section-heading__eyebrow">{{ t('generator.resultEyebrow') }}</p>
            <h2 id="palette-title">{{ t('generator.resultTitle') }}</h2>
          </div>
          <p class="section-heading__hint">{{ t('generator.resultHint') }}</p>
        </div>

        <PaletteGrid
          :swatches="swatches"
          :copied-hex="copiedHex"
          @toggle-lock="toggleLock"
          @copy="onCopy"
        />

        <PaletteActions
          :can-regenerate="canRegenerate"
          :can-undo="canUndo"
          :can-redo="canRedo"
          :locked-count="lockedGeneratedCount"
          @regenerate="regenerate"
          @undo="undo"
          @redo="redo"
          @unlock-all="unlockAll"
        />

        <p id="atajos" class="generator__shortcuts">{{ t('generator.shortcuts') }}</p>

        <!-- La IA vive entre la paleta y la exportación -->
        <AiPrompt
          :loading="aiLoading"
          :error="aiError"
          :result="aiResult"
          :examples="aiExamples"
          :locked-count="lockedGeneratedCount"
          @interpret="onInterpret"
        />

        <ExportPanel
          :formats="exportFormats"
          :copied-id="copiedId"
          @copy="onCopyFormat"
          @download="onDownloadFormat"
        />

        <SavePalettePanel />
      </section>
    </div>

    <p class="sr-only" aria-live="polite">{{ copyAnnouncement }}</p>
  </div>
</template>
