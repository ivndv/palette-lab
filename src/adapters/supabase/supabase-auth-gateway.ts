// Adaptador de auth sobre Supabase

import type { Session, User } from '@supabase/supabase-js'
import type { Sesion, Usuario } from '@/lib/auth'
import type { AuthGateway, SignUpOptions } from '@/ports/auth-gateway'
import { supabase } from './client'

// Falla temprano si faltan las variables de entorno
function client() {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  return supabase
}

// Traduce el modelo de Supabase al dominio
function toUsuario(user: User): Usuario {
  return { id: user.id, email: user.email ?? '' }
}

function toSesion(session: Session | null): Sesion | null {
  if (!session?.user) {
    return null
  }

  return { user: toUsuario(session.user), accessToken: session.access_token }
}

export class SupabaseAuthGateway implements AuthGateway {
  async getSession(): Promise<Sesion | null> {
    const { data, error } = await client().auth.getSession()

    if (error) {
      throw error
    }

    return toSesion(data.session)
  }

  // Devuelve la función para desuscribirse
  onChange(callback: (session: Sesion | null) => void): () => void {
    const { data } = client().auth.onAuthStateChange((_event, session) => {
      callback(toSesion(session))
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }

  async signIn(email: string, password: string, captchaToken?: string): Promise<Usuario> {
    const { data, error } = await client().auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })

    if (error) {
      throw error
    }

    return toUsuario(data.user)
  }

  async signUp(
    email: string,
    password: string,
    options: SignUpOptions = {},
  ): Promise<Usuario | null> {
    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: options.emailRedirectTo,
        captchaToken: options.captchaToken,
      },
    })

    if (error) {
      throw error
    }

    return data.user ? toUsuario(data.user) : null
  }

  // Redirige al proveedor; el retorno lo resuelve detectSessionInUrl
  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await client().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      throw error
    }
  }

  async resendConfirmation(
    email: string,
    redirectTo: string,
    captchaToken?: string,
  ): Promise<void> {
    const { error } = await client().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirectTo, captchaToken },
    })

    if (error) {
      throw error
    }
  }

  async requestPasswordReset(
    email: string,
    redirectTo: string,
    captchaToken?: string,
  ): Promise<void> {
    const { error } = await client().auth.resetPasswordForEmail(email, {
      redirectTo,
      captchaToken,
    })

    if (error) {
      throw error
    }
  }

  // Requiere la sesión de recuperación que crea el enlace del correo
  async updatePassword(password: string): Promise<void> {
    const { error } = await client().auth.updateUser({ password })

    if (error) {
      throw error
    }
  }

  async signOut(): Promise<void> {
    const { error } = await client().auth.signOut()

    if (error) {
      throw error
    }
  }
}

export const supabaseAuthGateway: AuthGateway = new SupabaseAuthGateway()
