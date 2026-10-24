<script setup lang="ts">
// Login con email, contraseña, Turnstile y Google

// Iconos
import { LoaderCircle, LogIn, Palette } from '@lucide/vue'
// Vue
import { computed, onMounted, ref, watch } from 'vue'
// Router
import { RouterLink, useRoute, useRouter } from 'vue-router'
// Componentes
import AuthLayout from '@/components/auth/AuthLayout.vue'
import GoogleButton from '@/components/auth/GoogleButton.vue'
import TurnstileWidget from '@/components/auth/TurnstileWidget.vue'
// Dominio
import { resolveRedirect } from '@/lib/auth-links'
import { isTurnstileEnabled } from '@/lib/turnstile'
// Stores
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Estado del formulario
const email = ref('')
const password = ref('')
const captchaToken = ref('')
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null)

// Sin site key el submit no exige token
const captchaRequired = isTurnstileEnabled()
const redirectTarget = computed(() => resolveRedirect(route.query.redirect))

const canSubmit = computed(
  () =>
    email.value.trim().length > 0 &&
    password.value.length > 0 &&
    (!captchaRequired || captchaToken.value.length > 0) &&
    !auth.loading,
)

const canResend = computed(
  () =>
    email.value.trim().length > 0 &&
    (!captchaRequired || captchaToken.value.length > 0) &&
    !auth.loading,
)

const registerLink = computed(() => ({
  name: 'register',
  query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

// El token de Turnstile es de un solo uso
function resetCaptcha(): void {
  captchaToken.value = ''
  turnstile.value?.reset()
}

// Si ya hay sesión, no tiene sentido mostrar el formulario
onMounted(() => {
  if (auth.isAuthenticated) {
    void router.replace(redirectTarget.value)
  }
})

watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      void router.replace(redirectTarget.value)
    }
  },
)

// Inicia sesión y reinicia el captcha si el intento falla
async function submit(): Promise<void> {
  auth.clearMessages()

  if (!canSubmit.value) {
    return
  }

  const ok = await auth.signIn(email.value.trim(), password.value, captchaToken.value || undefined)

  if (ok) {
    await router.replace(redirectTarget.value)
    return
  }

  resetCaptcha()
}

// Útil cuando el login falló por email sin confirmar
async function resend(): Promise<void> {
  await auth.resendConfirmation(email.value.trim(), captchaToken.value || undefined)
  resetCaptcha()
}

// El navegador sale a Google; el retorno lo resuelve Supabase
async function withGoogle(): Promise<void> {
  auth.clearMessages()

  const ok = await auth.signInWithGoogle(redirectTarget.value)

  if (!ok) {
    resetCaptcha()
  }
}
</script>

<template>
  <AuthLayout
    :icon="Palette"
    title="Bienvenido de nuevo"
    subtitle="Entrá para guardar tus paletas y volver a ellas cuando quieras."
  >
    <template #subtitle>
      ¿Primera vez?
      <RouterLink :to="registerLink">Creá tu cuenta</RouterLink>.
    </template>

    <form class="auth-form" @submit.prevent="submit">
      <div class="auth-field">
        <label for="login-email">Correo</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          placeholder="tu@correo.com"
          :disabled="auth.loading"
          :aria-invalid="Boolean(auth.error)"
          :aria-describedby="auth.error ? 'login-error' : undefined"
        />
      </div>

      <div class="auth-field">
        <label for="login-password">Contraseña</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          minlength="6"
          required
          placeholder="mínimo 6 caracteres"
          :disabled="auth.loading"
          :aria-invalid="Boolean(auth.error)"
          :aria-describedby="auth.error ? 'login-error' : undefined"
        />
      </div>

      <p class="auth-link-row">
        <RouterLink class="auth-link" to="/recuperar">
          ¿Olvidaste tu contraseña?
        </RouterLink>
      </p>

      <TurnstileWidget ref="turnstile" @token="captchaToken = $event" />

      <p v-if="auth.error" id="login-error" class="auth-alert" role="alert">
        {{ auth.error }}
        <button
          v-if="auth.emailConfirmationRequired"
          type="button"
          class="auth-alert__action"
          :disabled="!canResend"
          @click="resend"
        >
          Reenviar email de confirmación
        </button>
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
        <LogIn v-else :size="16" aria-hidden="true" />
        {{ auth.loading ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div class="auth-separator" aria-hidden="true">
      <span />
      <em>o</em>
      <span />
    </div>

    <GoogleButton :disabled="auth.loading" @click="withGoogle" />

    <template #footer>
      Al continuar aceptás el uso personal de Palette Lab.
    </template>
  </AuthLayout>
</template>
