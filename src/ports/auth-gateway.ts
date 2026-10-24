// Contrato de autenticación que consume la app

import type { Session, User } from '@supabase/supabase-js'

// Datos extra del registro
export interface SignUpOptions {
  captchaToken?: string
  emailRedirectTo?: string
}

// Implementado por Supabase y por el fake de los tests
export interface AuthGateway {
  getSession(): Promise<Session | null>
  onChange(callback: (session: Session | null) => void): () => void
  signIn(email: string, password: string, captchaToken?: string): Promise<User>
  signUp(email: string, password: string, options?: SignUpOptions): Promise<User | null>
  signInWithGoogle(redirectTo: string): Promise<void>
  resendConfirmation(email: string, redirectTo: string, captchaToken?: string): Promise<void>
  requestPasswordReset(email: string, redirectTo: string, captchaToken?: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>
}
