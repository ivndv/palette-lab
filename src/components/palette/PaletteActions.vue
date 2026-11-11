<script setup lang="ts">
// Barra de acciones: deshacer, rehacer, desbloquear y regenerar

import { LockOpen, Redo2, RefreshCw, Undo2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'

const { t } = useI18n()

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
        :title="t('actions.undoTitle')"
        @click="emit('undo')"
      >
        <Undo2 :size="16" aria-hidden="true" />
        {{ t('actions.undo') }}
      </AppButton>

      <AppButton
        variant="secondary"
        :disabled="!canRedo"
        :title="t('actions.redoTitle')"
        @click="emit('redo')"
      >
        <Redo2 :size="16" aria-hidden="true" />
        {{ t('actions.redo') }}
      </AppButton>

      <AppButton
        v-if="lockedCount > 0"
        variant="ghost"
        :title="t('actions.unlockAllTitle')"
        @click="emit('unlock-all')"
      >
        <LockOpen :size="16" aria-hidden="true" />
        {{ t('actions.unlockAll') }}
      </AppButton>

      <AppButton
        variant="primary"
        :disabled="!canRegenerate"
        :title="canRegenerate ? t('actions.regenerateTitle') : t('actions.allLocked')"
        @click="emit('regenerate')"
      >
        <RefreshCw :size="16" aria-hidden="true" />
        {{ t('actions.regenerate') }}
      </AppButton>
    </div>

    <span class="palette-actions__hint">
      {{ t('actions.lockedCount', { count: lockedCount }) }}
    </span>
  </div>
</template>
