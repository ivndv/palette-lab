// Pruebas del store de auth

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FakeAuthGateway, fakeSession } from '@/test/fake-auth-gateway'
import { resetAuthGateway, setAuthGateway, useAuthStore } from './auth'

let gateway: FakeAuthGateway

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  gateway = new FakeAuthGateway()
  setAuthGateway(gateway)
})

afterEach(() => {
  resetAuthGateway()
})

describe('useAuthStore', () => {
  it('inicializa la sesión existente', async () => {
    gateway.session = fakeSession('iva@example.com')
    const auth = useAuthStore()

    await auth.initialize()

    expect(auth.initialized).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.userEmail).toBe('iva@example.com')
  })

  it('inicia sesión y traduce credenciales inválidas', async () => {
    const auth = useAuthStore()
    gateway.failSignIn = {
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    }

    expect(await auth.signIn('iva@example.com', 'bad')).toBe(false)
    expect(auth.error).toBe('Email o contraseña incorrectos.')

    gateway.failSignIn = null

    expect(await auth.signIn('iva@example.com', 'secret123', 'captcha')).toBe(true)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.error).toBeNull()
    expect(gateway.signInCalls.at(-1)?.captchaToken).toBe('captcha')
  })

  it('marca que falta confirmar el email', async () => {
    const auth = useAuthStore()
    gateway.failSignIn = {
      code: 'email_not_confirmed',
      message: 'Email not confirmed',
    }

    expect(await auth.signIn('iva@example.com', 'secret123')).toBe(false)
    expect(auth.emailConfirmationRequired).toBe(true)

    auth.clearMessages()

    expect(auth.emailConfirmationRequired).toBe(false)
  })

  it('pide confirmación cuando el signup no devuelve sesión', async () => {
    const auth = useAuthStore()
    gateway.keepUnconfirmed = true

    expect(await auth.signUp('iva@example.com', 'secret123', 'captcha')).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.info).toContain('confirmar')
    expect(gateway.signUpCalls[0].options?.captchaToken).toBe('captcha')
    expect(gateway.signUpCalls[0].options?.emailRedirectTo).toContain('/confirmar')
  })

  it('reenvía la confirmación y limpia la marca', async () => {
    const auth = useAuthStore()
    gateway.failSignIn = { code: 'email_not_confirmed' }

    await auth.signIn('iva@example.com', 'secret123')

    expect(await auth.resendConfirmation('iva@example.com', 'captcha')).toBe(true)
    expect(gateway.resendCalls[0]).toMatchObject({
      email: 'iva@example.com',
      captchaToken: 'captcha',
    })
    expect(auth.emailConfirmationRequired).toBe(false)
    expect(auth.info).toContain('email')
  })

  it('traduce errores al reenviar la confirmación', async () => {
    const auth = useAuthStore()
    gateway.failResend = { message: 'captcha protection: request disallowed' }

    expect(await auth.resendConfirmation('iva@example.com')).toBe(false)
    expect(auth.error).toContain('verificación')
  })

  it('inicia sesión con Google y propaga errores', async () => {
    const auth = useAuthStore()

    expect(await auth.signInWithGoogle('/generador')).toBe(true)
    expect(gateway.googleCalls[0]).toBe(`${window.location.origin}/generador`)

    gateway.failGoogle = { code: 'provider_disabled' }

    expect(await auth.signInWithGoogle()).toBe(false)
    expect(auth.error).toContain('no está habilitado')
  })

  it('solicita recuperación y actualiza la contraseña', async () => {
    const auth = useAuthStore()

    expect(await auth.requestPasswordReset('iva@example.com', 'captcha')).toBe(true)
    expect(gateway.resetCalls[0]).toMatchObject({
      email: 'iva@example.com',
      captchaToken: 'captcha',
    })
    expect(gateway.resetCalls[0].redirectTo).toContain('/restablecer')
    expect(auth.info).toContain('enlace')

    expect(await auth.updatePassword('nueva123')).toBe(true)
    expect(gateway.passwordUpdates).toEqual(['nueva123'])
    expect(auth.info).toBe('Contraseña actualizada.')
  })

  it('traduce errores de recuperación y de contraseña', async () => {
    const auth = useAuthStore()
    gateway.failReset = { code: 'over_email_send_rate_limit' }

    expect(await auth.requestPasswordReset('iva@example.com')).toBe(false)
    expect(auth.error).toContain('demasiados emails')

    gateway.failUpdate = { code: 'same_password' }

    expect(await auth.updatePassword('igual')).toBe(false)
    expect(auth.error).toContain('distinta')
  })

  it('cierra sesión y limpia el usuario', async () => {
    gateway.session = fakeSession('iva@example.com')
    const auth = useAuthStore()

    await auth.initialize()
    await auth.signOut()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.userEmail).toBe('')
  })
})
