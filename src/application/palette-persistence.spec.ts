// Pruebas de la persistencia diferida

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaletteState } from '@/lib/palette'
import type { PaletteStorage } from '@/ports/palette-storage'
import { PalettePersistence } from './palette-persistence'

function state(base: string): PaletteState {
  return {
    version: 3,
    base: `#${base}`,
    sourceBase: `#${base}`,
    mode: 'analogous',
    tone: 'balanced',
    swatches: [],
  } as PaletteState
}

function createStorage(): { storage: PaletteStorage; save: ReturnType<typeof vi.fn> } {
  const save = vi.fn()

  return { storage: { load: () => null, save }, save }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PalettePersistence', () => {
  it('guarda el último estado tras el retraso', () => {
    const { storage, save } = createStorage()
    const persistence = new PalettePersistence(storage)

    persistence.schedule(state('111111'))
    persistence.schedule(state('222222'))
    vi.advanceTimersByTime(300)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ base: '#222222' }))
  })

  it('flush guarda de inmediato', () => {
    const { storage, save } = createStorage()
    const persistence = new PalettePersistence(storage)

    persistence.schedule(state('333333'))
    persistence.flush()

    expect(save).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(300)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('cancel descarta el guardado pendiente', () => {
    const { storage, save } = createStorage()
    const persistence = new PalettePersistence(storage)

    persistence.schedule(state('444444'))
    persistence.cancel()
    vi.advanceTimersByTime(300)

    expect(save).not.toHaveBeenCalled()
  })

  it('flush sin cambios no guarda', () => {
    const { storage, save } = createStorage()
    const persistence = new PalettePersistence(storage)

    persistence.flush()

    expect(save).not.toHaveBeenCalled()
  })
})
