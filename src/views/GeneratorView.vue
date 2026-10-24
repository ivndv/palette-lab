<script setup lang="ts">
// Generador: conecta el store, la IA, el copiado y la exportación

// Pinia
import { storeToRefs } from 'pinia'
// Vue
import { computed, ref } from 'vue'
// Router
import { useRoute } from 'vue-router'
// Adaptadores
import { httpPaletteInterpreter } from '@/adapters/http/http-palette-interpreter'
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
// Dominio
import type { InterpretedPalette } from '@/lib/ai'
import type { Hex } from '@/lib/color'
import { createExportFormats, download, type ExportFormat } from '@/lib/export'
import type { PaletteState } from '@/lib/palette'
import { PRESETS } from '@/lib/presets'
import { parseSharedPalette } from '@/lib/share'
// Stores
import { usePaletteStore } from '@/stores/palette'

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
const aiExamples = [
  'café artesanal',
  'atardecer en la playa',
  'cyberpunk neón',
  'minimalista sereno',
]

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
    return format.id === 'url' ? 'URL copiada' : `${format.label} copiado`
  }

  return `Copiado ${value}`
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

// La IA solo elige base, armonía y tono; los colores los genera el dominio
async function onInterpret(prompt: string): Promise<void> {
  if (aiLoading.value) {
    return
  }

  aiLoading.value = true
  aiError.value = null
  aiResult.value = null

  try {
    const parsed = await interpretPrompt(httpPaletteInterpreter, prompt)
    const applied = applyInterpretation({
      base: parsed.base,
      mode: parsed.mode,
      tone: parsed.tone,
      seed: parsed.seed,
    })

    if (!applied) {
      throw new Error('No pudimos aplicar la interpretación.')
    }

    aiResult.value = parsed
  } catch (error) {
    aiError.value =
      error instanceof Error ? error.message : 'No pudimos interpretar la descripción.'
  } finally {
    aiLoading.value = false
  }
}
</script>

<template>
  <div class="generator">
    <header class="page-heading">
      <p class="page-heading__eyebrow">Generador</p>
      <h1>Tu paleta, paso a paso.</h1>
      <p>
        Elige un color base, explora una armonía y bloquea los colores que quieras conservar.
      </p>
    </header>

    <div class="workspace">
      <aside class="workspace__controls" aria-label="Controles de la paleta">
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
            <p class="section-heading__eyebrow">03 · Resultado</p>
            <h2 id="palette-title">Tu paleta</h2>
          </div>
          <p class="section-heading__hint">Bloquea los colores que quieras conservar.</p>
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

        <p id="atajos" class="generator__shortcuts">
          Espacio: regenerar · U: deshacer · R: aleatorio
        </p>

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
