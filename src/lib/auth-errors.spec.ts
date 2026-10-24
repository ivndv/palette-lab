// Pruebas de los mensajes de error de auth

import { describe, expect, it } from 'vitest'
import { authErrorMessage, needsEmailConfirmation } from './auth-errors'

describe('authErrorMessage', () => {
  it('traduce credenciales inválidas', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toBe(
      'Email o contraseña incorrectos.',
    )
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Email o contraseña incorrectos.',
    )
  })

  it('traduce email sin confirmar y cuenta existente', () => {
    expect(authErrorMessage({ code: 'email_not_confirmed' })).toBe(
      'Tenés que confirmar tu email antes de entrar.',
    )
    expect(authErrorMessage({ code: 'user_already_exists' })).toBe(
      'Ya existe una cuenta con ese email.',
    )
  })

  it('detecta la falta de confirmación', () => {
    expect(needsEmailConfirmation({ code: 'email_not_confirmed' })).toBe(true)
    expect(needsEmailConfirmation({ message: 'Email not confirmed' })).toBe(true)
    expect(needsEmailConfirmation({ code: 'invalid_credentials' })).toBe(false)
    expect(needsEmailConfirmation(null)).toBe(false)
  })

  it('traduce contraseña débil, repetida y rate limit', () => {
    expect(authErrorMessage({ code: 'weak_password' })).toBe('La contraseña es demasiado débil.')
    expect(authErrorMessage({ code: 'same_password' })).toBe(
      'La contraseña nueva tiene que ser distinta a la anterior.',
    )
    expect(authErrorMessage({ message: 'Email rate limit exceeded' })).toBe(
      'Mandamos demasiados emails. Probá de nuevo en unos minutos.',
    )
    expect(authErrorMessage({ message: 'Rate limit exceeded' })).toBe(
      'Demasiados intentos. Esperá un momento.',
    )
  })

  it('traduce captcha y proveedores deshabilitados', () => {
    expect(authErrorMessage({ code: 'captcha_failed' })).toBe(
      'La verificación de seguridad falló. Intentá de nuevo.',
    )
    expect(
      authErrorMessage({
        message: 'captcha protection: request disallowed (invalid-input-response)',
      }),
    ).toBe('La verificación de seguridad falló. Intentá de nuevo.')
    expect(authErrorMessage({ message: 'Provider is not enabled' })).toBe(
      'Ese método de acceso no está habilitado en este entorno.',
    )
  })

  it('traduce falta de configuración y fallback', () => {
    expect(authErrorMessage(new Error('Supabase no está configurado.'))).toBe(
      'Supabase no está configurado en este entorno.',
    )
    expect(authErrorMessage({ message: 'otra cosa' })).toBe(
      'No pudimos completar la autenticación.',
    )
    expect(authErrorMessage(null)).toBe('No pudimos completar la autenticación.')
    expect(authErrorMessage('texto')).toBe('No pudimos completar la autenticación.')
  })
})
