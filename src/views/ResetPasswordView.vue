<script setup lang="ts">
// Restablecer: requiere la sesión que crea el enlace del correo

// Iconos
import { KeyRound, LoaderCircle, LockKeyhole } from '@lucide/vue'
// Vue
import { computed, onMounted, ref } from 'vue'
// Router
import { RouterLink, useRoute, useRouter } from 'vue-router'
// Componentes
import AuthLayout from '@/components/auth/AuthLayout.vue'
// Stores
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Estado del formulario
const password = ref('')
const confirmPassword = ref('')
const localError = ref<string | null>(null)
const ready = ref(false)
const invalidLink = ref(false)

const errorMessage = computed(() => localError.value ?? auth.error)

const canSubmit = computed(
  () => password.value.length >= 6 && confirmPassword.value.length >= 6 && !auth.loading,
)

// Sin sesión de recuperación el enlace no sirve
onMounted(async () => {
  await auth.initialize()
  ready.value = true
  invalidLink.value = Boolean(route.query.error) || !auth.isAuthenticated
})

// Guarda la contraseña nueva y vuelve a las paletas
async function submit(): Promise<void> {
  auth.clearMessages()
  localError.value = null

  if (!canSubmit.value) {
    return
  }

  if (password.value !== confirmPassword.value) {
    localError.value = 'Las contraseñas no coinciden.'
    return
  }

  const ok = await auth.updatePassword(password.value)

  if (ok) {
    await router.replace('/mis-paletas')
  }
}
</script>

<template>
  <AuthLayout
    :icon="LockKeyhole"
    :title="invalidLink ? 'Enlace inválido' : 'Nueva contraseña'"
    :subtitle="
      invalidLink
        ? 'El enlace expiró o ya se usó. Pedí uno nuevo para continuar.'
        : 'Elegí una contraseña nueva para tu cuenta.'
    "
  >
    <p v-if="!ready" class="auth-loading" role="status">
      <LoaderCircle :size="18" class="auth-spin" aria-hidden="true" />
      Validando el enlace…
    </p>

    <template v-else-if="invalidLink">
      <p class="auth-alert" role="alert">
        No pudimos validar el enlace de recuperación.
      </p>

      <RouterLink class="auth-button auth-button--primary" to="/recuperar">
        <KeyRound :size="16" aria-hidden="true" />
        Pedir otro enlace
      </RouterLink>
    </template>

    <form v-else class="auth-form" @submit.prevent="submit">
      <div class="auth-field">
        <label for="reset-password">Contraseña nueva</label>
        <input
          id="reset-password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="6"
          required
          placeholder="mínimo 6 caracteres"
          :disabled="auth.loading"
          :aria-invalid="Boolean(errorMessage)"
          :aria-describedby="errorMessage ? 'reset-error' : undefined"
        />
      </div>

      <div class="auth-field">
        <label for="reset-confirm">Confirmar contraseña</label>
        <input
          id="reset-confirm"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          minlength="6"
          required
          placeholder="repetí tu contraseña"
          :disabled="auth.loading"
          :aria-invalid="Boolean(errorMessage)"
          :aria-describedby="errorMessage ? 'reset-error' : undefined"
        />
      </div>

      <p v-if="errorMessage" id="reset-error" class="auth-alert" role="alert">
        {{ errorMessage }}
      </p>

      <button
        type="submit"
        class="auth-button auth-button--primary"
        :disabled="!canSubmit"
      >
        <LoaderCircle
          v-if="auth.loading"
          :size="16"
          class="auth-spin"
          aria-hidden="true"
        />
        <LockKeyhole v-else :size="16" aria-hidden="true" />
        {{ auth.loading ? 'Guardando…' : 'Guardar contraseña' }}
      </button>
    </form>

    <p class="auth-footnote">
      <RouterLink class="auth-link" to="/login">Volver a entrar</RouterLink>
    </p>
  </AuthLayout>
</template>
