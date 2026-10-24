// Pruebas de la validación de recetas que devuelve la IA

import { describe, expect, it } from 'vitest'
import { parseInterpretedPalette } from './ai'

describe('parseInterpretedPalette', () => {
  it('normaliza una receta válida', () => {
    expect(
      parseInterpretedPalette({
        base: '#B45309',
        mode: 'analogous',
        tone: 'muted',
        label: '  café cálido  ',
      }),
    ).toEqual({
      base: '#b45309',
      mode: 'analogous',
      tone: 'muted',
      label: 'café cálido',
    })
  })

  it('rechaza bases, modos o tonos inválidos', () => {
    expect(parseInterpretedPalette({ base: 'nope', mode: 'analogous', tone: 'muted' })).toBeNull()
    expect(parseInterpretedPalette({ base: '#b45309', mode: 'tetradic', tone: 'muted' })).toBeNull()
    expect(parseInterpretedPalette({ base: '#b45309', mode: 'analogous', tone: 'neon' })).toBeNull()
  })

  it('rechaza valores que no son objetos', () => {
    expect(parseInterpretedPalette(null)).toBeNull()
    expect(parseInterpretedPalette('nope')).toBeNull()
  })

  it('omite etiquetas vacías o demasiado largas', () => {
    const parsed = parseInterpretedPalette({
      base: '#b45309',
      mode: 'analogous',
      tone: 'muted',
      label: 'x'.repeat(80),
    })

    expect(parsed?.label).toHaveLength(60)
  })
})
