<script setup lang="ts">
// Guardado de la paleta actual en la cuenta

import { Save } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { SWATCH_COUNT } from '@/lib/palette'
import { savedErrorCode } from '@/lib/saved-palette'
import { useAuthStore } from '@/stores/auth'
import { usePaletteStore } from '@/stores/palette'
import { useSavedPalettesStore } from '@/stores/saved-palettes'

const { t } = useI18n()
const auth = useAuthStore()
const paletteStore = usePaletteStore()
const savedStore = useSavedPalettesStore()
const { sourceBase, base, mode, tone, swatches } = storeToRefs(paletteStore)

// Estado del formulario
const name = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

function savedErrorMessage(cause: unknown): string {
  const code = savedErrorCode(cause)

  return code ? t(`saved.errors.${code}`, { count: SWATCH_COUNT }) : t('save.error')
}

async function onSave(): Promise<void> {
  const value = name.value.trim()

  if (!value) {
    error.value = t('save.nameRequired')
    return
  }

  saving.value = true
  error.value = null
  message.value = null

  try {
    const saved = await savedStore.create({
      name: value,
      sourceBase: sourceBase.value,
      base: base.value,
      mode: mode.value,
      tone: tone.value,
      swatches: swatches.value.map((swatch) => swatch.hex),
    })

    name.value = ''
    message.value = t('save.savedAs', { name: saved.name })
  } catch (cause) {
    error.value = savedErrorMessage(cause)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="save-palette" aria-labelledby="save-palette-title">
    <div class="save-palette__copy">
      <h2 id="save-palette-title">
        {{ auth.isAuthenticated ? t('save.titleAuth') : t('save.titleGuest') }}
      </h2>
      <p v-if="auth.isAuthenticated">{{ t('save.leadAuth') }}</p>
      <p v-else>{{ t('save.leadGuest') }}</p>
    </div>

    <!-- Guardar exige sesión; el invitado ve los accesos -->
    <template v-if="auth.isAuthenticated">
      <form class="save-palette__form" @submit.prevent="onSave">
        <label class="sr-only" for="save-palette-name">{{ t('save.nameLabel') }}</label>
        <input
          id="save-palette-name"
          v-model="name"
          class="save-palette__input"
          type="text"
          maxlength="80"
          autocomplete="off"
          :placeholder="t('save.placeholder')"
          :disabled="saving"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? 'save-palette-error' : undefined"
        />
        <AppButton type="submit" variant="primary" :disabled="saving || !name.trim()">
          <Save :size="16" aria-hidden="true" />
          {{ saving ? t('save.saving') : t('save.save') }}
        </AppButton>
      </form>

      <p v-if="error" id="save-palette-error" class="save-palette__error" role="alert">
        {{ error }}
      </p>
      <p v-else-if="message" class="save-palette__message" aria-live="polite">
        {{ message }}
        <RouterLink to="/mis-paletas">{{ t('save.viewSaved') }}</RouterLink>
      </p>
      <p v-else class="save-palette__hint">
        {{ t('save.hint') }}
        <RouterLink to="/mis-paletas">{{ t('save.viewSaved') }}</RouterLink>
      </p>
    </template>

    <div v-else class="save-palette__auth">
      <RouterLink
        class="save-palette__auth-link"
        :to="{ path: '/login', query: { redirect: '/generador' } }"
      >
        {{ t('save.login') }}
      </RouterLink>
      <RouterLink
        class="save-palette__auth-link"
        :to="{ path: '/registro', query: { redirect: '/generador' } }"
      >
        {{ t('save.register') }}
      </RouterLink>
    </div>
  </section>
</template>
