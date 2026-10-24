<script setup lang="ts">
// Guardado de la paleta actual en la cuenta

import { Save } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuthStore } from '@/stores/auth'
import { usePaletteStore } from '@/stores/palette'
import { useSavedPalettesStore } from '@/stores/saved-palettes'

const auth = useAuthStore()
const paletteStore = usePaletteStore()
const savedStore = useSavedPalettesStore()
const { sourceBase, base, mode, tone, swatches } = storeToRefs(paletteStore)

// Estado del formulario
const name = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

async function onSave(): Promise<void> {
  const value = name.value.trim()

  if (!value) {
    error.value = 'Poné un nombre para la paleta.'
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
    message.value = `Guardada como “${saved.name}”.`
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No pudimos guardar la paleta.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="save-palette" aria-labelledby="save-palette-title">
    <div class="save-palette__copy">
      <h2 id="save-palette-title">
        {{ auth.isAuthenticated ? 'Guardar paleta' : 'Guardá tus paletas' }}
      </h2>
      <p v-if="auth.isAuthenticated">
        Guarda esta combinación para volver a ella cuando quieras.
      </p>
      <p v-else>
        Creá una cuenta o iniciá sesión para guardar tus paletas y acceder a ellas desde
        cualquier dispositivo.
      </p>
    </div>

    <!-- Guardar exige sesión; el invitado ve los accesos -->
    <template v-if="auth.isAuthenticated">
      <form class="save-palette__form" @submit.prevent="onSave">
        <label class="sr-only" for="save-palette-name">Nombre de la paleta</label>
        <input
          id="save-palette-name"
          v-model="name"
          class="save-palette__input"
          type="text"
          maxlength="80"
          autocomplete="off"
          placeholder="Ej. Atardecer"
          :disabled="saving"
          :aria-invalid="Boolean(error)"
          :aria-describedby="error ? 'save-palette-error' : undefined"
        />
        <AppButton type="submit" variant="primary" :disabled="saving || !name.trim()">
          <Save :size="16" aria-hidden="true" />
          {{ saving ? 'Guardando…' : 'Guardar' }}
        </AppButton>
      </form>

      <p v-if="error" id="save-palette-error" class="save-palette__error" role="alert">
        {{ error }}
      </p>
      <p v-else-if="message" class="save-palette__message" aria-live="polite">
        {{ message }}
        <RouterLink to="/mis-paletas">Ver mis paletas</RouterLink>
      </p>
      <p v-else class="save-palette__hint">
        Se guarda en tu cuenta con el color base, la armonía, el tono y los cinco colores.
        <RouterLink to="/mis-paletas">Ver mis paletas</RouterLink>
      </p>
    </template>

    <div v-else class="save-palette__auth">
      <RouterLink
        class="save-palette__auth-link"
        :to="{ path: '/login', query: { redirect: '/generador' } }"
      >
        Entrar
      </RouterLink>
      <RouterLink
        class="save-palette__auth-link"
        :to="{ path: '/registro', query: { redirect: '/generador' } }"
      >
        Crear cuenta
      </RouterLink>
    </div>
  </section>
</template>
