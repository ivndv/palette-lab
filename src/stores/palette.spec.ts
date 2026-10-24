// Pruebas del store que envuelve usePalette

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePaletteStore } from './palette'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('usePaletteStore', () => {
  it('expone el estado y las acciones de la paleta', () => {
    const store = usePaletteStore()

    expect(store.base).toMatch(/^#[0-9a-f]{6}$/)
    expect(store.mode).toBe('analogous')
    expect(store.swatches).toHaveLength(5)

    store.setMode('triadic')

    expect(store.mode).toBe('triadic')
  })

  it('mantiene el undo a través del store', () => {
    const store = usePaletteStore()

    store.setTone('pastel')
    expect(store.tone).toBe('pastel')

    store.undo()

    expect(store.tone).toBe('balanced')
  })
})
