// Adaptador de auth sobre Supabase

import type { Session, User } from '@supabase/supabase-js'
import type { AuthGateway, SignUpOptions } from '@/ports/auth-gateway'
import { supabase } from './client'

// Falla temprano si faltan las variables de entorno
function client() {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  return supabase
}

export class SupabaseAuthGateway implements AuthGateway {
  async getSession(): Promise<Session | null> {
    const { data, error } = await client().auth.getSession()

    if (error) {
      throw error
    }

    return data.session
  }

  // Devuelve la función para desuscribirse
  onChange(callback: (session: Session | null) => void): () => void {
    const { data } = client().auth.onAuthStateChange((_event, session) => {
      callback(session)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }

  async signIn(email: string, password: string, captchaToken?: string): Promise<User> {
    const { data, error } = await client().auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })

    if (error) {
      throw error
    }

    return data.user
  }

  async signUp(email: string, password: string, options: SignUpOptions = {}): Promise<User | null> {
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

    return data.user
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
