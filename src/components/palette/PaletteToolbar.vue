<script setup lang="ts">
// Barra de control: base, armonía, tono, recetas y acciones

// Iconos
import { Dices, RefreshCw, Undo2 } from '@lucide/vue'
// Vue
import { computed, ref, watch } from 'vue'
// Componentes
import AppButton from '@/components/ui/AppButton.vue'
// Dominio
import { type Hex, normalizeHex } from '@/lib/color'
import {
  HARMONY_MODES,
  type HarmonyMode,
  isPaletteTone,
  PALETTE_TONES,
  type PaletteTone,
} from '@/lib/palette'
import type { Preset } from '@/lib/presets'

const props = withDefaults(
  defineProps<{
    base: Hex
    appliedBase: Hex
    mode: HarmonyMode
    tone: PaletteTone
    canRegenerate: boolean
    canUndo?: boolean
    lockedCount: number
    presets: Preset[]
    selectedPresetId: string | null
    showActions?: boolean
  }>(),
  {
    showActions: true,
  },
)

const emit = defineEmits<{
  'update:base': [value: string]
  'update:mode': [value: HarmonyMode]
  'update:tone': [value: PaletteTone]
  regenerate: []
  undo: []
  randomize: []
  'apply-preset': [preset: Preset]
}>()

// Estado del input HEX
const hexInput = ref<string>(props.base)
const hexError = ref<string | null>(null)

const modeDescription = computed(
  () => HARMONY_MODES.find((option) => option.id === props.mode)?.description ?? '',
)
const toneDescription = computed(
  () => PALETTE_TONES.find((option) => option.id === props.tone)?.description ?? '',
)
const toneLabel = computed(
  () => PALETTE_TONES.find((option) => option.id === props.tone)?.label ?? '',
)

// Mantiene el input sincronizado con cambios externos
watch(
  () => props.base,
  (value) => {
    hexInput.value = value
    hexError.value = null
  },
)

function commitHex(): void {
  const normalized = normalizeHex(hexInput.value)

  if (!normalized) {
    hexError.value = 'HEX inválido. Usa #rrggbb.'
    return
  }

  hexError.value = null
  hexInput.value = normalized

  if (normalized !== props.base) {
    emit('update:base', normalized)
  }
}

// El picker nativo emite en vivo mientras se arrastra
function onColorInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  hexInput.value = value
  hexError.value = null
  emit('update:base', value)
}

function onToneChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value

  if (isPaletteTone(value)) {
    emit('update:tone', value)
  }
}
</script>

<template>
  <section class="palette-toolbar" aria-labelledby="toolbar-title">
    <h2 id="toolbar-title" class="sr-only">Controles de paleta</h2>

    <div class="palette-toolbar__field">
      <label class="palette-toolbar__label" for="base-color">Color base</label>
      <div class="palette-toolbar__base-row">
        <input
          id="base-color"
          class="palette-toolbar__picker"
          type="color"
          :value="base"
          aria-label="Elegir color base"
          @input="onColorInput"
        />

        <input
          v-model="hexInput"
          class="palette-toolbar__hex"
          type="text"
          maxlength="7"
          spellcheck="false"
          aria-label="HEX del color base"
          @blur="commitHex"
          @keydown.enter.prevent="commitHex"
        />

        <AppButton variant="ghost" @click="emit('randomize')">
          <Dices :size="16" aria-hidden="true" />
          Aleatorio
        </AppButton>
      </div>

      <!-- Avisa cuando el tono adapta el color elegido -->
      <p v-if="hexError" class="palette-toolbar__error" role="alert">{{ hexError }}</p>
      <p v-else-if="appliedBase !== base" class="palette-toolbar__adapted">
        Tono {{ toneLabel }} → se aplica <code>{{ appliedBase }}</code>
      </p>
    </div>

    <fieldset class="palette-toolbar__field">
      <legend class="palette-toolbar__label">Armonía</legend>
      <div class="palette-toolbar__modes">
        <AppButton
          v-for="option in HARMONY_MODES"
          :key="option.id"
          :variant="option.id === mode ? 'primary' : 'secondary'"
          :pressed="option.id === mode"
          @click="emit('update:mode', option.id)"
        >
          {{ option.label }}
        </AppButton>
      </div>
      <p class="palette-toolbar__hint">{{ modeDescription }}</p>
    </fieldset>

    <div class="palette-toolbar__field">
      <label class="palette-toolbar__label" for="palette-tone">Tono</label>
      <select
        id="palette-tone"
        class="palette-toolbar__select"
        :value="tone"
        aria-label="Tono de la paleta"
        @change="onToneChange"
      >
        <option v-for="option in PALETTE_TONES" :key="option.id" :value="option.id">
          {{ option.label }}
        </option>
      </select>
      <p class="palette-toolbar__hint">{{ toneDescription }}</p>
    </div>

    <div class="palette-toolbar__field">
      <span class="palette-toolbar__label">Recetas</span>
      <div class="palette-toolbar__chips">
        <button
          v-for="preset in presets"
          :key="preset.id"
          type="button"
          class="palette-toolbar__chip"
          :class="{ 'palette-toolbar__chip--active': preset.id === selectedPresetId }"
          :aria-pressed="preset.id === selectedPresetId"
          @click="emit('apply-preset', preset)"
        >
          {{ preset.name }}
        </button>
      </div>
    </div>

    <!-- Acciones opcionales: el home reutiliza la barra sin botones -->
    <div v-if="showActions !== false" class="palette-toolbar__actions">
      <div class="palette-toolbar__action-group">
        <AppButton
          variant="secondary"
          :disabled="!canUndo"
          title="Deshacer la última regeneración"
          @click="emit('undo')"
        >
          <Undo2 :size="16" aria-hidden="true" />
          Deshacer
        </AppButton>

        <AppButton
          variant="primary"
          :disabled="!canRegenerate"
          :title="canRegenerate ? 'Generar otra paleta' : 'Todos los colores están bloqueados'"
          @click="emit('regenerate')"
        >
          <RefreshCw :size="16" aria-hidden="true" />
          Regenerar
        </AppButton>
      </div>

      <span class="palette-toolbar__hint">{{ lockedCount }} bloqueados</span>
    </div>
  </section>
</template>
