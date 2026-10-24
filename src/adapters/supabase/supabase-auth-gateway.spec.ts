// Pruebas del adaptador de auth de Supabase

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseAuthGateway } from './supabase-auth-gateway'

const mocks = vi.hoisted(() => {
  const auth = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  }

  return { auth, supabase: { auth } }
})

vi.mock('./client', () => ({ supabase: mocks.supabase }))

const gateway = new SupabaseAuthGateway()

const user = { id: 'user-1', email: 'iva@example.com' }
const session = { access_token: 'token', user }

beforeEach(() => {
  for (const fn of Object.values(mocks.auth)) {
    fn.mockReset()
  }
})

describe('SupabaseAuthGateway', () => {
  it('lee la sesión y se suscribe a los cambios', async () => {
    const unsubscribe = vi.fn()

    mocks.auth.getSession.mockResolvedValue({ data: { session }, error: null })
    mocks.auth.onAuthStateChange.mockImplementation(
      (callback: (event: string, next: unknown) => void) => {
        callback('SIGNED_IN', session)

        return { data: { subscription: { unsubscribe } } }
      },
    )

    expect(await gateway.getSession()).toBe(session)

    const onChange = vi.fn()
    const stop = gateway.onChange(onChange)

    expect(onChange).toHaveBeenCalledWith(session)

    stop()

    expect(unsubscribe).toHaveBeenCalled()
  })

  it('propaga el error de sesión', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error('boom'),
    })

    await expect(gateway.getSession()).rejects.toThrow('boom')
  })

  it('inicia sesión con captcha', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: { user, session },
      error: null,
    })

    await expect(gateway.signIn('iva@example.com', 'secret123', 'captcha-token')).resolves.toBe(
      user,
    )

    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'iva@example.com',
      password: 'secret123',
      options: { captchaToken: 'captcha-token' },
    })
  })

  it('propaga el error de login', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('invalid'),
    })

    await expect(gateway.signIn('iva@example.com', 'bad')).rejects.toThrow('invalid')
  })

  it('registra con redirect y captcha', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user }, error: null })

    await expect(
      gateway.signUp('iva@example.com', 'secret123', {
        captchaToken: 'captcha-token',
        emailRedirectTo: 'http://localhost/confirmar',
      }),
    ).resolves.toBe(user)

    expect(mocks.auth.signUp).toHaveBeenCalledWith({
      email: 'iva@example.com',
      password: 'secret123',
      options: {
        captchaToken: 'captcha-token',
        emailRedirectTo: 'http://localhost/confirmar',
      },
    })
  })

  it('propaga el error de registro', async () => {
    mocks.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: new Error('weak'),
    })

    await expect(gateway.signUp('iva@example.com', 'x')).rejects.toThrow('weak')
  })

  it('inicia el flujo de Google', async () => {
    mocks.auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com' },
      error: null,
    })

    await gateway.signInWithGoogle('http://localhost/mis-paletas')

    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost/mis-paletas' },
    })
  })

  it('propaga el error del flujo de Google', async () => {
    mocks.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: new Error('provider is not enabled'),
    })

    await expect(gateway.signInWithGoogle('http://localhost/login')).rejects.toThrow(
      'provider is not enabled',
    )
  })

  it('reenvía la confirmación', async () => {
    mocks.auth.resend.mockResolvedValue({ data: {}, error: null })

    await gateway.resendConfirmation(
      'iva@example.com',
      'http://localhost/confirmar',
      'captcha-token',
    )

    expect(mocks.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'iva@example.com',
      options: {
        emailRedirectTo: 'http://localhost/confirmar',
        captchaToken: 'captcha-token',
      },
    })
  })

  it('pide el enlace de recuperación', async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })

    await gateway.requestPasswordReset(
      'iva@example.com',
      'http://localhost/restablecer',
      'captcha-token',
    )

    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith('iva@example.com', {
      redirectTo: 'http://localhost/restablecer',
      captchaToken: 'captcha-token',
    })
  })

  it('actualiza la contraseña y cierra sesión', async () => {
    mocks.auth.updateUser.mockResolvedValue({ data: {}, error: null })
    mocks.auth.signOut.mockResolvedValue({ error: null })

    await gateway.updatePassword('nueva123')
    await gateway.signOut()

    expect(mocks.auth.updateUser).toHaveBeenCalledWith({
      password: 'nueva123',
    })
    expect(mocks.auth.signOut).toHaveBeenCalled()
  })

  it('propaga errores de actualización y cierre', async () => {
    mocks.auth.updateUser.mockResolvedValue({
      data: {},
      error: new Error('same password'),
    })
    mocks.auth.signOut.mockResolvedValue({ error: new Error('offline') })

    await expect(gateway.updatePassword('x')).rejects.toThrow('same password')
    await expect(gateway.signOut()).rejects.toThrow('offline')
  })
})
