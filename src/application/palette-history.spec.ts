// Pruebas del historial de undo/redo

import { describe, expect, it, vi } from 'vitest'
import { HISTORY_LIMIT, PaletteHistory } from './palette-history'

describe('PaletteHistory', () => {
  it('hace undo y redo', () => {
    const history = new PaletteHistory<number>()
    history.push('mode', 1)
    history.push('tone', 2)

    expect(history.undo(3)).toBe(2)
    expect(history.canRedo).toBe(true)
    expect(history.redo(2)).toBe(3)
    expect(history.canRedo).toBe(false)
  })

  it('devuelve null si no hay estados', () => {
    const history = new PaletteHistory<number>()

    expect(history.undo(1)).toBeNull()
    expect(history.redo(1)).toBeNull()
  })

  it('acota el historial al límite', () => {
    const history = new PaletteHistory<number>()

    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      history.push('regenerate', i)
    }

    let last: number | null = null

    for (let i = 0; i < HISTORY_LIMIT; i += 1) {
      last = history.undo(-1)
    }

    expect(last).toBe(5)
    expect(history.undo(-1)).toBeNull()
  })

  it('agrupa las ráfagas del picker de color', () => {
    const history = new PaletteHistory<number>()
    history.push('base', 1, 1000)
    history.push('base', 2, 1200)
    history.push('base', 3, 1400)

    expect(history.undo(0)).toBe(3)
    expect(history.undo(0)).toBe(1)
  })

  it('notifica los cambios de estado', () => {
    const onChange = vi.fn()
    const history = new PaletteHistory<number>(onChange)

    history.push('mode', 1)
    history.undo(2)
    history.redo(2)

    expect(onChange).toHaveBeenCalledTimes(3)
    expect(onChange).toHaveBeenLastCalledWith({ canUndo: true, canRedo: false })
  })
})
