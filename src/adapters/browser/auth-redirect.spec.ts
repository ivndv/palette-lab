// Pruebas del redirect absoluto de auth

import { describe, expect, it } from 'vitest'
import { authRedirect } from './auth-redirect'

describe('authRedirect', () => {
  it('arma la URL sobre el origen actual', () => {
    expect(authRedirect('/login')).toBe(`${window.location.origin}/login`)
  })
})
