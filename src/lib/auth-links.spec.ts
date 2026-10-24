// Pruebas de los redirects internos

import { describe, expect, it } from 'vitest'
import { authRedirect, isSafeRedirect, resolveRedirect } from './auth-links'

describe('auth-links', () => {
  it('acepta rutas internas y rechaza externas', () => {
    expect(isSafeRedirect('/mis-paletas')).toBe(true)
    expect(isSafeRedirect('//evil.test')).toBe(false)
    expect(isSafeRedirect('https://evil.test')).toBe(false)
    expect(isSafeRedirect(undefined)).toBe(false)
    expect(isSafeRedirect(['/a'])).toBe(false)
  })

  it('resuelve el redirect con fallback', () => {
    expect(resolveRedirect('/generador')).toBe('/generador')
    expect(resolveRedirect('https://evil.test')).toBe('/mis-paletas')
    expect(resolveRedirect(null, '/generador')).toBe('/generador')
  })

  it('arma una URL absoluta sobre el origen actual', () => {
    expect(authRedirect('/login')).toBe(`${window.location.origin}/login`)
  })
})
