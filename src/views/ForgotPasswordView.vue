<script setup lang="ts">
// Recuperación: envía el enlace al email

// Iconos
import { KeyRound, LoaderCircle, Mail } from '@lucide/vue'
// Vue
import { computed, ref } from 'vue'
// Router
import { RouterLink } from 'vue-router'
// Componentes
import AuthLayout from '@/components/auth/AuthLayout.vue'
import TurnstileWidget from '@/components/auth/TurnstileWidget.vue'
// Dominio
import { isTurnstileEnabled } from '@/lib/turnstile'
// Stores
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

// Estado del formulario
const email = ref('')
const captchaToken = ref('')
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null)

const captchaRequired = isTurnstileEnabled()

const canSubmit = computed(
  () =>
    email.value.trim().length > 0 &&
    (!captchaRequired || captchaToken.value.length > 0) &&
    !auth.loading,
)

function resetCaptcha(): void {
  captchaToken.value = ''
  turnstile.value?.reset()
}

// El enlace se envía siempre, pero el mensaje no revela si el email existe
async function submit(): Promise<void> {
  auth.clearMessages()

  if (!canSubmit.value) {
    return
  }

  await auth.requestPasswordReset(email.value.trim(), captchaToken.value || undefined)
  resetCaptcha()
}
</script>

<template>
  <AuthLayout
    :icon="KeyRound"
    title="Recuperá tu acceso"
    subtitle="Te enviamos un enlace para restablecer tu contraseña."
  >
    <form class="auth-form" @submit.prevent="submit">
      <div class="auth-field">
        <label for="recover-email">Correo</label>
        <input
          id="recover-email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          placeholder="tu@correo.com"
          :disabled="auth.loading"
          :aria-invalid="Boolean(auth.error)"
          :aria-describedby="auth.error ? 'recover-error' : undefined"
        />
      </div>

      <TurnstileWidget ref="turnstile" @token="captchaToken = $event" />

      <p v-if="auth.error" id="recover-error" class="auth-alert" role="alert">
        {{ auth.error }}
      </p>
      <p v-else-if="auth.info" class="auth-alert auth-alert--info" aria-live="polite">
        {{ auth.info }}
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
        <Mail v-else :size="16" aria-hidden="true" />
        {{ auth.loading ? 'Enviando…' : 'Enviar enlace' }}
      </button>
    </form>

    <p class="auth-footnote">
      <RouterLink class="auth-link" to="/login">Volver a entrar</RouterLink>
    </p>
  </AuthLayout>
</template>
