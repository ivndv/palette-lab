// Pruebas de creación, validación y copia de paletas guardadas

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createId,
  createSavedPalette,
  duplicateSavedPalette,
  isSavedPalette,
  renameSavedPalette,
  type SavedPalette,
  type SavedPaletteInput,
} from './saved-palette'

afterEach(() => {
  vi.unstubAllGlobals()
})

const INPUT: SavedPaletteInput = {
  name: 'Atardecer',
  sourceBase: '#f97316',
  base: '#f9a8d4',
  mode: 'analogous',
  tone: 'pastel',
  swatches: ['#fde68a', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd'],
}

describe('saved palette', () => {
  it('crea una paleta válida y normaliza los HEX', () => {
    const palette = createSavedPalette({
      ...INPUT,
      swatches: ['#FDE68A', '#FCA5A5', '#F9A8D4', '#C4B5FD', '#93C5FD'],
    })

    expect(palette.name).toBe('Atardecer')
    expect(palette.swatches).toEqual(INPUT.swatches)
    expect(isSavedPalette(palette)).toBe(true)
  })

  it('rechaza nombres, bases o colores inválidos', () => {
    expect(() => createSavedPalette({ ...INPUT, name: '   ' })).toThrow(
      'El nombre debe tener entre 1 y 80 caracteres.',
    )
    expect(() =>
      createSavedPalette({ ...INPUT, swatches: ['#nope', ...INPUT.swatches.slice(1)] }),
    ).toThrow('La paleta contiene un HEX inválido.')
    expect(() =>
      createSavedPalette({
        ...INPUT,
        swatches: ['#fde68a', '#fde68a', '#f9a8d4', '#c4b5fd', '#93c5fd'],
      }),
    ).toThrow('La paleta contiene colores repetidos.')
  })

  it('exige que el base esté anclado en el centro', () => {
    expect(() => createSavedPalette({ ...INPUT, base: '#fde68a' })).toThrow(
      'El color base no está anclado en la paleta.',
    )
  })

  it('renombra y duplica sin compartir el mismo id', () => {
    const palette = createSavedPalette(INPUT)
    const renamed = renameSavedPalette(palette, '  Otoño  ')
    const duplicate = duplicateSavedPalette(renamed)

    expect(renamed.name).toBe('Otoño')
    expect(renamed.id).toBe(palette.id)
    expect(duplicate.id).not.toBe(palette.id)
    expect(duplicate.name).toBe('Otoño copia')
    expect(duplicate.swatches).toEqual(palette.swatches)
  })

  it('rechaza un objeto guardado incompleto', () => {
    expect(isSavedPalette(null)).toBe(false)
    expect(isSavedPalette({ id: 'x' })).toBe(false)
  })

  it('rechaza cada campo inválido', () => {
    const palette = createSavedPalette(INPUT)
    const invalid: unknown[] = [
      { ...palette, id: '' },
      { ...palette, name: '' },
      { ...palette, name: 'x'.repeat(81) },
      { ...palette, createdAt: 'nope' },
      { ...palette, updatedAt: 'nope' },
      { ...palette, sourceBase: '#ABCDEF' },
      { ...palette, base: 'nope' },
      { ...palette, mode: 'tetradic' },
      { ...palette, tone: 'neon' },
      { ...palette, swatches: [] },
      { ...palette, swatches: ['#nope', ...palette.swatches.slice(1)] },
      { ...palette, swatches: ['#fde68a', '#fde68a', '#f9a8d4', '#c4b5fd', '#93c5fd'] },
      { ...palette, base: '#000000' },
    ]

    for (const value of invalid) {
      expect(isSavedPalette(value)).toBe(false)
    }
  })

  it('rechaza armonía, tono o longitud inválidos al crear', () => {
    expect(() => createSavedPalette({ ...INPUT, mode: 'tetradic' as never })).toThrow(
      'La armonía o el tono son inválidos.',
    )
    expect(() => createSavedPalette({ ...INPUT, tone: 'neon' as never })).toThrow(
      'La armonía o el tono son inválidos.',
    )
    expect(() => createSavedPalette({ ...INPUT, swatches: ['#fde68a'] })).toThrow(
      'La paleta debe tener 5 colores.',
    )
    expect(() => createSavedPalette({ ...INPUT, name: 'x'.repeat(81) })).toThrow(
      'El nombre debe tener entre 1 y 80 caracteres.',
    )
  })

  it('rechaza renombres inválidos', () => {
    const palette = createSavedPalette(INPUT)

    expect(() => renameSavedPalette(palette, '')).toThrow(
      'El nombre debe tener entre 1 y 80 caracteres.',
    )
    expect(() => renameSavedPalette(palette, 'x'.repeat(81))).toThrow(
      'El nombre debe tener entre 1 y 80 caracteres.',
    )
  })

  it('genera un UUID aunque no exista randomUUID', () => {
    vi.stubGlobal('crypto', {})

    expect(createId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('trunca el nombre de una copia larga', () => {
    const palette = createSavedPalette({ ...INPUT, name: 'x'.repeat(80) })
    const duplicate: SavedPalette = duplicateSavedPalette(palette)

    expect(duplicate.name).toHaveLength(80)
  })
})
