// Doble de AuthGateway para tests

import type { Session, User } from '@supabase/supabase-js'
import type { AuthGateway, SignUpOptions } from '@/ports/auth-gateway'

export function fakeUser(email = 'iva@example.com'): User {
  return { id: 'user-1', email } as User
}

export function fakeSession(email = 'iva@example.com'): Session {
  return { user: fakeUser(email), access_token: 'token' } as Session
}

export interface FakeCall {
  email: string
  password?: string
  captchaToken?: string
  redirectTo?: string
  options?: SignUpOptions
}

export class FakeAuthGateway implements AuthGateway {
  session: Session | null = null
  listener: ((session: Session | null) => void) | null = null
  keepUnconfirmed = false
  failSignIn: unknown = null
  failSignUp: unknown = null
  failResend: unknown = null
  failGoogle: unknown = null
  failReset: unknown = null
  failUpdate: unknown = null

  signInCalls: FakeCall[] = []
  signUpCalls: FakeCall[] = []
  resendCalls: FakeCall[] = []
  resetCalls: FakeCall[] = []
  googleCalls: string[] = []
  passwordUpdates: string[] = []

  async getSession(): Promise<Session | null> {
    return this.session
  }

  onChange(callback: (session: Session | null) => void): () => void {
    this.listener = callback

    return () => {
      this.listener = null
    }
  }

  async signIn(email: string, password: string, captchaToken?: string): Promise<User> {
    this.signInCalls.push({ email, password, captchaToken })

    if (this.failSignIn) {
      throw this.failSignIn
    }

    this.session = fakeSession(email)
    this.listener?.(this.session)

    return this.session.user
  }

  async signUp(email: string, password: string, options?: SignUpOptions): Promise<User | null> {
    this.signUpCalls.push({ email, password, options })

    if (this.failSignUp) {
      throw this.failSignUp
    }

    if (this.keepUnconfirmed) {
      return fakeUser(email)
    }

    this.session = fakeSession(email)
    this.listener?.(this.session)

    return this.session.user
  }

  async signInWithGoogle(redirectTo: string): Promise<void> {
    this.googleCalls.push(redirectTo)

    if (this.failGoogle) {
      throw this.failGoogle
    }
  }

  async resendConfirmation(
    email: string,
    redirectTo: string,
    captchaToken?: string,
  ): Promise<void> {
    this.resendCalls.push({ email, redirectTo, captchaToken })

    if (this.failResend) {
      throw this.failResend
    }
  }

  async requestPasswordReset(
    email: string,
    redirectTo: string,
    captchaToken?: string,
  ): Promise<void> {
    this.resetCalls.push({ email, redirectTo, captchaToken })

    if (this.failReset) {
      throw this.failReset
    }
  }

  async updatePassword(password: string): Promise<void> {
    this.passwordUpdates.push(password)

    if (this.failUpdate) {
      throw this.failUpdate
    }
  }

  async signOut(): Promise<void> {
    this.session = null
    this.listener?.(null)
  }
}
