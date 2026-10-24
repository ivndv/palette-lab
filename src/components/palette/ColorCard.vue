<script setup lang="ts">
// Card de un color con contraste, lock y copiado

import { Check, Copy, Lock, LockOpen } from '@lucide/vue'
import { computed } from 'vue'
import { bestTextColor, contrastRatio, type Hex, hexToHsl, wcagLevel } from '@/lib/color'
import type { Swatch } from '@/lib/palette'

const props = defineProps<{
  swatch: Swatch
  index: number
  base: boolean
  copied: boolean
}>()

const emit = defineEmits<{
  'toggle-lock': [id: string]
  copy: [hex: Hex]
}>()

// Texto legible y su nivel WCAG
const textColor = computed(() => bestTextColor(props.swatch.hex))
const ratio = computed(() => contrastRatio(props.swatch.hex, textColor.value))
const level = computed(() => wcagLevel(ratio.value))
const hsl = computed(() => hexToHsl(props.swatch.hex))
const isLocked = computed(() => props.base || props.swatch.locked)

// Etiquetas accesibles que no dependen del color
const roleLabel = computed(() => (props.base ? 'Color base' : `Color ${props.index + 1}`))
const lockLabel = computed(() =>
  props.swatch.locked ? `Desbloquear ${props.swatch.hex}` : `Bloquear ${props.swatch.hex}`,
)
</script>

<template>
  <article
    class="color-card"
    :class="{ 'color-card--base': base }"
    :style="{ backgroundColor: swatch.hex, color: textColor }"
  >
    <div class="color-card__top">
      <span class="color-card__role">{{ roleLabel }}</span>
      <span v-if="base" class="color-card__base-badge">Base</span>
    </div>

    <strong class="color-card__hex">{{ swatch.hex }}</strong>
    <span class="color-card__hsl">
      {{ hsl.h.toFixed(1) }}° · {{ hsl.s.toFixed(0) }}% · {{ hsl.l.toFixed(0) }}%
    </span>
    <span class="color-card__contrast">{{ ratio.toFixed(2) }}:1 · {{ level }}</span>

    <div class="color-card__actions">
      <!-- El base no se bloquea: se muestra como anclado -->
      <span
        v-if="base"
        class="color-card__action color-card__action--static"
        aria-label="Color base anclado"
      >
        <Lock :size="15" aria-hidden="true" />
        <span>Base</span>
      </span>

      <button
        v-else
        type="button"
        class="color-card__action"
        :aria-pressed="isLocked"
        :aria-label="lockLabel"
        @click="emit('toggle-lock', swatch.id)"
      >
        <Lock v-if="isLocked" :size="15" aria-hidden="true" />
        <LockOpen v-else :size="15" aria-hidden="true" />
        <span>{{ isLocked ? 'Bloqueado' : 'Libre' }}</span>
      </button>

      <button
        type="button"
        class="color-card__action"
        :aria-label="`Copiar ${swatch.hex}`"
        @click="emit('copy', swatch.hex)"
      >
        <Check v-if="copied" :size="15" aria-hidden="true" />
        <Copy v-else :size="15" aria-hidden="true" />
        <span>{{ copied ? 'Copiado' : 'Copiar' }}</span>
      </button>
    </div>
  </article>
</template>
