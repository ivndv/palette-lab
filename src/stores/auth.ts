// Estado de autenticación y acciones de la cuenta

import type { Session, User } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabaseAuthGateway } from '@/adapters/supabase/supabase-auth-gateway'
import { authErrorMessage, needsEmailConfirmation } from '@/lib/auth-errors'
import { authRedirect } from '@/lib/auth-links'
import type { AuthGateway } from '@/ports/auth-gateway'

let activeGateway: AuthGateway = supabaseAuthGateway

export function setAuthGateway(gateway: AuthGateway): void {
  activeGateway = gateway
}

export function resetAuthGateway(): void {
  activeGateway = supabaseAuthGateway
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const info = ref<string | null>(null)
  const emailConfirmationRequired = ref(false)

  let unsubscribe: (() => void) | null = null

  const isAuthenticated = computed(() => Boolean(session.value))
  const userEmail = computed(() => user.value?.email ?? '')
  const userInitial = computed(() => (userEmail.value[0] ?? '?').toUpperCase())

  function setSession(next: Session | null): void {
    session.value = next
    user.value = next?.user ?? null
  }

  // Limpia mensajes y marca al empezar una acción
  function startRequest(): void {
    loading.value = true
    error.value = null
    info.value = null
    emailConfirmationRequired.value = false
  }

  async function initialize(): Promise<void> {
    if (initialized.value) {
      return
    }

    loading.value = true

    try {
      setSession(await activeGateway.getSession())
      unsubscribe = activeGateway.onChange(setSession)
    } catch (cause) {
      error.value = authErrorMessage(cause)
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  // El token de Turnstile es opcional para permitir entornos sin captcha
  async function signIn(email: string, password: string, captchaToken?: string): Promise<boolean> {
    startRequest()

    try {
      await activeGateway.signIn(email, password, captchaToken)
      setSession(await activeGateway.getSession())

      return Boolean(session.value)
    } catch (cause) {
      error.value = authErrorMessage(cause)
      emailConfirmationRequired.value = needsEmailConfirmation(cause)

      return false
    } finally {
      loading.value = false
    }
  }

  // Con confirmación activa no hay sesión hasta abrir el enlace del correo
  async function signUp(email: string, password: string, captchaToken?: string): Promise<boolean> {
    startRequest()

    try {
      const created = await activeGateway.signUp(email, password, {
        captchaToken,
        emailRedirectTo: authRedirect('/confirmar'),
      })
      setSession(await activeGateway.getSession())

      if (!session.value) {
        info.value = 'Revisá tu email para confirmar la cuenta.'
      }

      return Boolean(session.value ?? created)
    } catch (cause) {
      error.value = authErrorMessage(cause)

      return false
    } finally {
      loading.value = false
    }
  }

  async function resendConfirmation(email: string, captchaToken?: string): Promise<boolean> {
    startRequest()

    try {
      await activeGateway.resendConfirmation(email, authRedirect('/confirmar'), captchaToken)
      emailConfirmationRequired.value = false
      info.value = 'Te enviamos un email nuevo para confirmar la cuenta.'

      return true
    } catch (cause) {
      error.value = authErrorMessage(cause)

      return false
    } finally {
      loading.value = false
    }
  }

  // El navegador se va al proveedor; el retorno lo resuelve detectSessionInUrl
  async function signInWithGoogle(redirectPath?: string): Promise<boolean> {
    startRequest()

    try {
      await activeGateway.signInWithGoogle(authRedirect(redirectPath ?? '/mis-paletas'))

      return true
    } catch (cause) {
      error.value = authErrorMessage(cause)

      return false
    } finally {
      loading.value = false
    }
  }

  // No revela si el email existe o no
  async function requestPasswordReset(email: string, captchaToken?: string): Promise<boolean> {
    startRequest()

    try {
      await activeGateway.requestPasswordReset(email, authRedirect('/restablecer'), captchaToken)
      info.value = 'Si el email existe, te mandamos un enlace para restablecer la contraseña.'

      return true
    } catch (cause) {
      error.value = authErrorMessage(cause)

      return false
    } finally {
      loading.value = false
    }
  }

  async function updatePassword(password: string): Promise<boolean> {
    startRequest()

    try {
      await activeGateway.updatePassword(password)
      info.value = 'Contraseña actualizada.'

      return true
    } catch (cause) {
      error.value = authErrorMessage(cause)

      return false
    } finally {
      loading.value = false
    }
  }

  async function signOut(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await activeGateway.signOut()
      setSession(null)
      info.value = null
    } catch (cause) {
      error.value = authErrorMessage(cause)
    } finally {
      loading.value = false
    }
  }

  function clearMessages(): void {
    error.value = null
    info.value = null
    emailConfirmationRequired.value = false
  }

  function dispose(): void {
    unsubscribe?.()
    unsubscribe = null
    initialized.value = false
  }

  return {
    session,
    user,
    loading,
    initialized,
    error,
    info,
    emailConfirmationRequired,
    isAuthenticated,
    userEmail,
    userInitial,
    initialize,
    signIn,
    signUp,
    resendConfirmation,
    signInWithGoogle,
    requestPasswordReset,
    updatePassword,
    signOut,
    clearMessages,
    dispose,
  }
})
