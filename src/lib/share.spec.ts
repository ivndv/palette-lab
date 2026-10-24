// Pruebas del round-trip de la paleta en la URL

import { describe, expect, it } from 'vitest'
import { createPaletteState } from './palette'
import { parseSharedPalette, toShareUrl } from './share'

const state = createPaletteState('#4f46e5', 'analogous', 42, 'pastel')

describe('share URL', () => {
  it('hace round-trip de configuración y swatches', () => {
    const url = toShareUrl(state, 'https://palette-lab.test')
    const query = new URL(url).searchParams
    const parsed = parseSharedPalette(query)

    expect(parsed).not.toBeNull()
    expect(parsed?.sourceBase).toBe(state.sourceBase)
    expect(parsed?.base).toBe(state.swatches[2].hex)
    expect(parsed?.mode).toBe('analogous')
    expect(parsed?.tone).toBe('pastel')
    expect(parsed?.swatches).toEqual(state.swatches.map((swatch) => swatch.hex))
  })

  it('genera una paleta determinista si no vienen swatches', () => {
    const parsed = parseSharedPalette(
      new URLSearchParams({ b: '#f97316', m: 'triadic', t: 'vivid' }),
    )

    expect(parsed?.swatches).toHaveLength(5)
    expect(parsed?.base).toBe(parsed?.swatches[2])
  })

  it('acepta un objeto de query de Vue Router', () => {
    const parsed = parseSharedPalette({
      b: '#f97316',
      m: 'complementary',
      t: 'vivid',
    })

    expect(parsed?.mode).toBe('complementary')
    expect(parsed?.tone).toBe('vivid')
  })

  it('rechaza parámetros inválidos', () => {
    expect(parseSharedPalette(new URLSearchParams({ b: 'nope', m: 'analogous' }))).toBeNull()
    expect(parseSharedPalette(new URLSearchParams({ b: '#4f46e5', m: 'tetradic' }))).toBeNull()
    expect(
      parseSharedPalette(new URLSearchParams({ b: '#4f46e5', m: 'analogous', t: 'neon' })),
    ).toBeNull()
  })
})
