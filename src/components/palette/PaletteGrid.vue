<script setup lang="ts">
// Grilla de los cinco colores

import type { Hex } from '@/lib/color'
import { BASE_INDEX, type Swatch } from '@/lib/palette'
import ColorCard from './ColorCard.vue'

defineProps<{
  swatches: Swatch[]
  copiedHex: Hex | null
}>()

const emit = defineEmits<{
  'toggle-lock': [id: string]
  copy: [hex: Hex]
}>()
</script>

<template>
  <ul class="palette-grid">
    <li v-for="(swatch, index) in swatches" :key="swatch.id" class="palette-grid__item">
      <ColorCard
        :swatch="swatch"
        :index="index"
        :base="index === BASE_INDEX"
        :copied="copiedHex === swatch.hex"
        @toggle-lock="emit('toggle-lock', $event)"
        @copy="emit('copy', $event)"
      />
    </li>
  </ul>
</template>
