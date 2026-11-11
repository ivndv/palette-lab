// Contrato de autenticación que consume la app

import type { Sesion, Usuario } from '@/lib/auth'

// Datos extra del registro
export interface SignUpOptions {
  captchaToken?: string
  emailRedirectTo?: string
}

// Implementado por Supabase y por el fake de los tests
export interface AuthGateway {
  getSession(): Promise<Sesion | null>
  onChange(callback: (session: Sesion | null) => void): () => void
  signIn(email: string, password: string, captchaToken?: string): Promise<Usuario>
  signUp(email: string, password: string, options?: SignUpOptions): Promise<Usuario | null>
  signInWithGoogle(redirectTo: string): Promise<void>
  resendConfirmation(email: string, redirectTo: string, captchaToken?: string): Promise<void>
  requestPasswordReset(email: string, redirectTo: string, captchaToken?: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>
}
