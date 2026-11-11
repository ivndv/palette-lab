<script setup lang="ts">
// Registro con confirmación de contraseña y Turnstile

// Iconos
import { LoaderCircle, UserPlus } from '@lucide/vue'
// Vue
import { computed, onMounted, ref, watch } from 'vue'
// i18n
import { useI18n } from 'vue-i18n'
// Router
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { isTurnstileEnabled } from '@/adapters/turnstile/turnstile'
// Componentes
import AuthLayout from '@/components/auth/AuthLayout.vue'
import GoogleButton from '@/components/auth/GoogleButton.vue'
import TurnstileWidget from '@/components/auth/TurnstileWidget.vue'
// Dominio
import { resolveRedirect } from '@/lib/auth-links'
// Stores
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Estado del formulario
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const captchaToken = ref('')
const localError = ref<string | null>(null)
const turnstile = ref<InstanceType<typeof TurnstileWidget> | null>(null)

const captchaRequired = isTurnstileEnabled()
const redirectTarget = computed(() => resolveRedirect(route.query.redirect))

const canSubmit = computed(
  () =>
    email.value.trim().length > 0 &&
    password.value.length >= 6 &&
    confirmPassword.value.length >= 6 &&
    (!captchaRequired || captchaToken.value.length > 0) &&
    !auth.loading,
)

const loginLink = computed(() => ({
  name: 'login',
  query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

const errorMessage = computed(() => localError.value ?? auth.error)

function resetCaptcha(): void {
  captchaToken.value = ''
  turnstile.value?.reset()
}

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

// Registro: valida la confirmación antes de llamar al store
async function submit(): Promise<void> {
  auth.clearMessages()
  localError.value = null

  if (!canSubmit.value) {
    return
  }

  if (password.value !== confirmPassword.value) {
    localError.value = t('auth.register.mismatch')
    return
  }

  const ok = await auth.signUp(email.value.trim(), password.value, captchaToken.value || undefined)

  resetCaptcha()

  if (!ok) {
    return
  }

  password.value = ''
  confirmPassword.value = ''

  if (auth.isAuthenticated) {
    await router.replace(redirectTarget.value)
  }
}

async function withGoogle(): Promise<void> {
  auth.clearMessages()
  localError.value = null

  const ok = await auth.signInWithGoogle(redirectTarget.value)

  if (!ok) {
    resetCaptcha()
  }
}
</script>

<template>
  <AuthLayout
    :icon="UserPlus"
    :title="t('auth.register.title')"
    :subtitle="t('auth.register.subtitle')"
  >
    <template #subtitle>
      {{ t('auth.register.already') }}
      <RouterLink :to="loginLink">{{ t('auth.register.loginLink') }}</RouterLink>.
    </template>

    <form class="auth-form" @submit.prevent="submit">
      <div class="auth-field">
        <label for="register-email">{{ t('auth.register.email') }}</label>
        <input
          id="register-email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          :placeholder="t('auth.register.emailPlaceholder')"
          :disabled="auth.loading"
          :aria-invalid="Boolean(errorMessage)"
          :aria-describedby="errorMessage ? 'register-error' : undefined"
        />
      </div>

      <div class="auth-field">
        <label for="register-password">{{ t('auth.register.password') }}</label>
        <input
          id="register-password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="6"
          required
          :placeholder="t('auth.register.passwordPlaceholder')"
          :disabled="auth.loading"
          :aria-invalid="Boolean(errorMessage)"
          :aria-describedby="errorMessage ? 'register-error' : undefined"
        />
      </div>

      <div class="auth-field">
        <label for="register-confirm">{{ t('auth.register.confirm') }}</label>
        <input
          id="register-confirm"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          minlength="6"
          required
          :placeholder="t('auth.register.confirmPlaceholder')"
          :disabled="auth.loading"
          :aria-invalid="Boolean(errorMessage)"
          :aria-describedby="errorMessage ? 'register-error' : undefined"
        />
      </div>

      <TurnstileWidget ref="turnstile" @token="captchaToken = $event" />

      <p v-if="errorMessage" id="register-error" class="auth-alert" role="alert">
        {{ errorMessage }}
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
        <UserPlus v-else :size="16" aria-hidden="true" />
        {{ auth.loading ? t('auth.register.submitting') : t('auth.register.submit') }}
      </button>
    </form>

    <div class="auth-separator" aria-hidden="true">
      <span />
      <em>{{ t('auth.separator') }}</em>
      <span />
    </div>

    <GoogleButton :disabled="auth.loading" @click="withGoogle" />

    <template #footer>
      {{ t('auth.register.footer') }}
    </template>
  </AuthLayout>
</template>
