<script setup lang="ts">
// Barra de acciones: deshacer, rehacer, desbloquear y regenerar

import { LockOpen, Redo2, RefreshCw, Undo2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'

defineProps<{
  canRegenerate: boolean
  canUndo: boolean
  canRedo: boolean
  lockedCount: number
}>()

const emit = defineEmits<{
  regenerate: []
  undo: []
  redo: []
  'unlock-all': []
}>()
</script>

<template>
  <div class="palette-actions">
    <div class="palette-actions__buttons">
      <AppButton
        variant="secondary"
        :disabled="!canUndo"
        title="Deshacer el último cambio"
        @click="emit('undo')"
      >
        <Undo2 :size="16" aria-hidden="true" />
        Deshacer
      </AppButton>

      <AppButton
        variant="secondary"
        :disabled="!canRedo"
        title="Rehacer el último cambio"
        @click="emit('redo')"
      >
        <Redo2 :size="16" aria-hidden="true" />
        Rehacer
      </AppButton>

      <AppButton
        v-if="lockedCount > 0"
        variant="ghost"
        title="Desbloquear todos los colores generados"
        @click="emit('unlock-all')"
      >
        <LockOpen :size="16" aria-hidden="true" />
        Desbloquear todo
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

    <span class="palette-actions__hint">{{ lockedCount }} bloqueados</span>
  </div>
</template>
