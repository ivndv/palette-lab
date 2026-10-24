<script setup lang="ts">
// Panel de exportación con selector de formato

import { Check, ClipboardCopy, Download, ExternalLink } from '@lucide/vue'
import { computed, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { ExportFormat } from '@/lib/export'

const props = defineProps<{
  formats: ExportFormat[]
  copiedId: string | null
}>()

const emit = defineEmits<{
  copy: [format: ExportFormat]
  download: [format: ExportFormat]
}>()

// CSS es el formato por defecto
const selectedId = ref(props.formats[0]?.id ?? 'css')
const selected = computed(
  () => props.formats.find((format) => format.id === selectedId.value) ?? props.formats[0],
)
const copied = computed(() => selected.value?.id === props.copiedId)
</script>

<template>
  <section class="export-panel" aria-labelledby="export-title">
    <div class="export-panel__header">
      <div class="export-panel__copy">
        <h2 id="export-title">Exportar</h2>
        <p>Lleva la paleta a tu proyecto en el formato que necesites.</p>
      </div>

      <!-- Grupo de botones: aria-pressed refleja el formato activo -->
      <div class="export-panel__tabs" role="group" aria-label="Formato de exportación">
        <button
          v-for="format in formats"
          :key="format.id"
          type="button"
          :aria-pressed="selectedId === format.id"
          :class="{ 'export-panel__tab--active': selectedId === format.id }"
          @click="selectedId = format.id"
        >
          {{ format.label }}
        </button>
      </div>
    </div>

    <div v-if="selected" class="export-panel__panel">
      <pre class="export-panel__preview"><code>{{ selected.content }}</code></pre>

      <div class="export-panel__actions">
        <AppButton variant="secondary" @click="emit('copy', selected)">
          <Check v-if="copied" :size="16" aria-hidden="true" />
          <ClipboardCopy v-else :size="16" aria-hidden="true" />
          {{ copied ? 'Copiado' : 'Copiar' }}
        </AppButton>

        <!-- La URL se abre; los archivos se descargan -->
        <AppButton v-if="selected.filename" variant="ghost" @click="emit('download', selected)">
          <Download :size="16" aria-hidden="true" />
          Descargar
        </AppButton>

        <a
          v-else
          class="export-panel__link"
          :href="selected.content"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink :size="16" aria-hidden="true" />
          Abrir URL
        </a>
      </div>
    </div>
  </section>
</template>
