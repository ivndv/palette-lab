// Pruebas de persistencia y migración del estado

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPaletteState } from './palette'
import {
  isLegacyPaletteState,
  isLegacyPaletteStateV2,
  isPaletteState,
  loadPaletteState,
  PALETTE_STORAGE_KEY,
  savePaletteState,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('isPaletteState', () => {
  it('acepta un estado v3 válido', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42, 'pastel')

    expect(isPaletteState(state)).toBe(true)
  })

  it('rechaza versiones antiguas, tonos y bases originales inválidas', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42)

    expect(isPaletteState({ ...state, version: 1 })).toBe(false)
    expect(isPaletteState({ ...state, version: 2 })).toBe(false)
    expect(isPaletteState({ ...state, tone: 'neon' })).toBe(false)
    expect(isPaletteState({ ...state, sourceBase: 'nope' })).toBe(false)
  })

  it('rechaza estados con el base desanclado', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42)
    const swatches = state.swatches.map((swatch, index) =>
      index === 2 ? { ...swatch, hex: '#f97316' } : swatch,
    )

    expect(isPaletteState({ ...state, swatches })).toBe(false)
  })

  it('rechaza swatches inválidos o repetidos', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42)
    const invalid = state.swatches.map((swatch, index) =>
      index === 0 ? { ...swatch, id: '' } : swatch,
    )
    const repeated = state.swatches.map((swatch, index) =>
      index === 1 ? { ...swatch, id: state.swatches[0].id } : swatch,
    )

    expect(isPaletteState({ ...state, swatches: invalid })).toBe(false)
    expect(isPaletteState({ ...state, swatches: repeated })).toBe(false)
  })
})

describe('isLegacyPaletteState', () => {
  it('acepta el formato v1', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42)

    expect(
      isLegacyPaletteState({
        version: 1,
        base: state.base,
        mode: state.mode,
        swatches: state.swatches,
      }),
    ).toBe(true)
  })

  it('rechaza un v1 incompleto', () => {
    expect(isLegacyPaletteState({ version: 1 })).toBe(false)
  })
})

describe('isLegacyPaletteStateV2', () => {
  it('acepta el formato v2', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42, 'pastel')

    expect(
      isLegacyPaletteStateV2({
        version: 2,
        base: state.base,
        mode: state.mode,
        tone: state.tone,
        swatches: state.swatches,
      }),
    ).toBe(true)
  })

  it('rechaza un v2 sin tono válido', () => {
    expect(isLegacyPaletteStateV2({ version: 2, tone: 'neon' })).toBe(false)
  })
})

describe('loadPaletteState', () => {
  it('devuelve null si no hay nada guardado', () => {
    expect(loadPaletteState()).toBeNull()
  })

  it('carga un estado v3 guardado', () => {
    const state = createPaletteState('#f97316', 'triadic', 42, 'vivid')

    expect(savePaletteState(state)).toBe(true)
    expect(loadPaletteState()).toEqual(state)
  })

  it('migra un estado v1 a v3 con tono equilibrado', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42)
    const legacy = {
      version: 1,
      base: state.base,
      mode: state.mode,
      swatches: state.swatches,
    }

    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(legacy))

    const loaded = loadPaletteState()

    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(3)
    expect(loaded?.tone).toBe('balanced')
    expect(loaded?.base).toBe('#4f46e5')
    expect(loaded?.sourceBase).toBe('#4f46e5')
  })

  it('migra un estado v2 a v3 conservando el base como original', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42, 'pastel')
    const legacy = {
      version: 2,
      base: state.base,
      mode: state.mode,
      tone: state.tone,
      swatches: state.swatches,
    }

    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(legacy))

    const loaded = loadPaletteState()

    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(3)
    expect(loaded?.tone).toBe('pastel')
    expect(loaded?.base).toBe(state.base)
    expect(loaded?.sourceBase).toBe(state.base)
  })

  it('devuelve null si el JSON es inválido', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, '{')

    expect(loadPaletteState()).toBeNull()
  })

  it('devuelve null si el estado no es válido', () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ version: 99 }))

    expect(loadPaletteState()).toBeNull()
  })

  it('tolera la ausencia de localStorage', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42)

    vi.stubGlobal('localStorage', undefined)

    expect(loadPaletteState()).toBeNull()
    expect(savePaletteState(state)).toBe(false)
  })

  it('devuelve false si falla la escritura', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42)
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    expect(savePaletteState(state)).toBe(false)
  })
})
