// Pruebas del motor de paleta

import { describe, expect, it } from 'vitest'
import { type Hex, hexToHsl } from '@/lib/color'
import {
  adaptBaseToTone,
  BASE_INDEX,
  type HarmonyMode,
  type PaletteTone,
  type Swatch,
} from '@/lib/palette'
import { PRESETS } from '@/lib/presets'
import { createSavedPalette } from '@/lib/saved-palette'
import { usePalette } from './usePalette'

function hexes(swatches: Swatch[]): string[] {
  return swatches.map((swatch) => swatch.hex)
}

describe('usePalette', () => {
  it('inicia con una paleta válida y el base anclado', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    expect(palette.base.value).toBe('#4f46e5')
    expect(palette.mode.value).toBe('analogous')
    expect(palette.swatches.value).toHaveLength(5)
    expect(palette.swatches.value[BASE_INDEX].hex).toBe('#4f46e5')
    expect(palette.swatches.value[BASE_INDEX].locked).toBe(true)
    expect(palette.lockedCount.value).toBe(1)
    expect(palette.lockedGeneratedCount.value).toBe(0)
    expect(palette.canRegenerate.value).toBe(true)
    expect(palette.selectedPresetId.value).toBeNull()
  })

  it('inicia con tono equilibrado por defecto o con el tono indicado', () => {
    const defaults = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const pastel = usePalette({
      base: '#4f46e5',
      mode: 'analogous',
      tone: 'pastel',
      seed: 42,
    })

    expect(defaults.tone.value).toBe('balanced')
    expect(defaults.sourceBase.value).toBe('#4f46e5')
    expect(pastel.tone.value).toBe('pastel')
    expect(pastel.sourceBase.value).toBe('#4f46e5')
    expect(pastel.base.value).toBe(adaptBaseToTone('#4f46e5', 'pastel'))
  })

  it('usa valores por defecto y una base aleatoria válida', () => {
    const palette = usePalette()

    expect(palette.base.value).toMatch(/^#[0-9a-f]{6}$/)
    expect(palette.mode.value).toBe('analogous')

    palette.randomizeBase()

    expect(palette.base.value).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('rechaza una base inválida', () => {
    expect(() => usePalette({ base: '#nope' as `#${string}` })).toThrow('Color base inválido')
  })

  it('actualiza la base y conserva los locks', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const lockedId = palette.swatches.value[0].id
    const lockedHex = palette.swatches.value[0].hex

    palette.toggleLock(lockedId)
    const changed = palette.setBase('#f97316')

    expect(changed).toBe(true)
    expect(palette.sourceBase.value).toBe('#f97316')
    expect(palette.base.value).toBe('#f97316')
    expect(palette.swatches.value[BASE_INDEX].hex).toBe('#f97316')
    expect(palette.swatches.value[0].hex).toBe(lockedHex)
    expect(palette.swatches.value[0].locked).toBe(true)
    expect(palette.error.value).toBeNull()
    expect(palette.selectedPresetId.value).toBeNull()
  })

  it('no regenera si la base no cambia', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const previous = hexes(palette.swatches.value)

    expect(palette.setBase('#4f46e5')).toBe(true)
    expect(hexes(palette.swatches.value)).toEqual(previous)
  })

  it('mantiene la base anterior si el HEX es inválido', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const previous = hexes(palette.swatches.value)

    expect(palette.setBase('nope')).toBe(false)
    expect(palette.base.value).toBe('#4f46e5')
    expect(hexes(palette.swatches.value)).toEqual(previous)
    expect(palette.error.value).toBe('HEX inválido. Usa #rrggbb.')
  })

  it('cambia de modo y conserva los locks', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const lockedId = palette.swatches.value[1].id
    const lockedHex = palette.swatches.value[1].hex

    palette.toggleLock(lockedId)
    palette.setMode('triadic')

    expect(palette.mode.value).toBe('triadic')
    expect(palette.base.value).toBe('#4f46e5')
    expect(palette.swatches.value[BASE_INDEX].hex).toBe('#4f46e5')
    expect(palette.swatches.value[1].hex).toBe(lockedHex)
    expect(palette.swatches.value[1].locked).toBe(true)
  })

  it('no regenera si el modo no cambia', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const previous = hexes(palette.swatches.value)

    palette.setMode('analogous')

    expect(palette.mode.value).toBe('analogous')
    expect(hexes(palette.swatches.value)).toEqual(previous)
  })

  it('ignora un modo inválido', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    palette.setMode('tetradic' as HarmonyMode)

    expect(palette.mode.value).toBe('analogous')
    expect(palette.error.value).toBe('Modo de armonía inválido.')
  })

  it('adapta el base al cambiar de tono y conserva el original y los locks', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const lockedId = palette.swatches.value[0].id
    const lockedHex = palette.swatches.value[0].hex
    const adapted = adaptBaseToTone('#4f46e5', 'pastel')

    palette.toggleLock(lockedId)
    palette.setTone('pastel')

    expect(palette.tone.value).toBe('pastel')
    expect(palette.sourceBase.value).toBe('#4f46e5')
    expect(palette.base.value).toBe(adapted)
    expect(palette.swatches.value[BASE_INDEX].hex).toBe(adapted)
    expect(palette.swatches.value[0].hex).toBe(lockedHex)
    expect(palette.swatches.value[0].locked).toBe(true)
  })

  it('vuelve al base original al volver a equilibrado', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    palette.setTone('pastel')
    palette.setTone('balanced')

    expect(palette.sourceBase.value).toBe('#4f46e5')
    expect(palette.base.value).toBe('#4f46e5')
  })

  it('adapta el base nuevo al tono activo', () => {
    const palette = usePalette({
      base: '#4f46e5',
      mode: 'analogous',
      tone: 'muted',
      seed: 42,
    })

    palette.setBase('#f97316')

    expect(palette.sourceBase.value).toBe('#f97316')
    expect(palette.base.value).toBe(adaptBaseToTone('#f97316', 'muted'))
  })

  it('no regenera si el tono no cambia', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const previous = hexes(palette.swatches.value)

    palette.setTone('balanced')

    expect(hexes(palette.swatches.value)).toEqual(previous)
  })

  it('ignora un tono inválido', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    palette.setTone('neon' as PaletteTone)

    expect(palette.tone.value).toBe('balanced')
    expect(palette.error.value).toBe('Tono inválido.')
  })

  it('mantiene el tono al cambiar la base o el modo', () => {
    const palette = usePalette({
      base: '#4f46e5',
      mode: 'analogous',
      tone: 'muted',
      seed: 42,
    })

    palette.setBase('#f97316')
    expect(palette.tone.value).toBe('muted')

    palette.setMode('triadic')
    expect(palette.tone.value).toBe('muted')
  })

  it('aplica una interpretación de forma atómica y permite deshacer', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const before = hexes(palette.swatches.value)
    const adapted = adaptBaseToTone('#f97316', 'dark')

    const applied = palette.applyInterpretation({
      base: '#f97316',
      mode: 'triadic',
      tone: 'dark',
      seed: 99,
    })

    expect(applied).toBe(true)
    expect(palette.sourceBase.value).toBe('#f97316')
    expect(palette.base.value).toBe(adapted)
    expect(palette.mode.value).toBe('triadic')
    expect(palette.tone.value).toBe('dark')
    expect(palette.swatches.value[BASE_INDEX].hex).toBe(adapted)
    expect(palette.canUndo.value).toBe(true)

    palette.undo()

    expect(palette.sourceBase.value).toBe('#4f46e5')
    expect(palette.base.value).toBe('#4f46e5')
    expect(palette.mode.value).toBe('analogous')
    expect(palette.tone.value).toBe('balanced')
    expect(hexes(palette.swatches.value)).toEqual(before)
  })

  it('deshace y rehace cambios de modo', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    palette.setMode('triadic')

    expect(palette.mode.value).toBe('triadic')
    expect(palette.canUndo.value).toBe(true)

    palette.undo()

    expect(palette.mode.value).toBe('analogous')
    expect(palette.canRedo.value).toBe(true)

    palette.redo()

    expect(palette.mode.value).toBe('triadic')
  })

  it('deshace cambios de lock', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const id = palette.swatches.value[0].id

    palette.toggleLock(id)

    expect(palette.swatches.value[0].locked).toBe(true)

    palette.undo()

    expect(palette.swatches.value[0].locked).toBe(false)
  })

  it('desbloquea todos los colores generados y permite deshacer', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    palette.toggleLock(palette.swatches.value[0].id)
    palette.toggleLock(palette.swatches.value[3].id)

    expect(palette.lockedGeneratedCount.value).toBe(2)

    palette.unlockAll()

    expect(palette.lockedGeneratedCount.value).toBe(0)

    palette.undo()

    expect(palette.lockedGeneratedCount.value).toBe(2)
  })

  it('restaura el preset seleccionado al deshacer', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const preset = PRESETS[0]

    palette.applyPreset(preset)
    expect(palette.selectedPresetId.value).toBe(preset.id)

    palette.undo()

    expect(palette.selectedPresetId.value).toBeNull()
  })

  it('carga una paleta guardada y permite deshacer', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const before = hexes(palette.swatches.value)
    const saved = createSavedPalette({
      name: 'Atardecer',
      sourceBase: '#f97316',
      base: '#f9a8d4',
      mode: 'analogous',
      tone: 'pastel',
      swatches: ['#fde68a', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd'],
    })

    palette.applySavedPalette(saved)

    expect(palette.sourceBase.value).toBe(saved.sourceBase)
    expect(palette.base.value).toBe(saved.base)
    expect(palette.mode.value).toBe(saved.mode)
    expect(palette.tone.value).toBe(saved.tone)
    expect(hexes(palette.swatches.value)).toEqual(saved.swatches)
    expect(palette.swatches.value[BASE_INDEX].locked).toBe(true)

    palette.undo()

    expect(hexes(palette.swatches.value)).toEqual(before)
  })

  it('aplica una paleta compartida y permite deshacer', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const before = hexes(palette.swatches.value)
    const shared = {
      sourceBase: '#f97316' as const,
      base: '#f9a8d4' as const,
      mode: 'analogous' as const,
      tone: 'pastel' as const,
      swatches: ['#fde68a', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd'] as Hex[],
    }

    expect(palette.applySharedPalette(shared)).toBe(true)
    expect(hexes(palette.swatches.value)).toEqual([...shared.swatches])

    palette.undo()

    expect(hexes(palette.swatches.value)).toEqual(before)
  })

  it('rechaza paletas compartidas inválidas', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    expect(
      palette.applySharedPalette({
        sourceBase: '#4f46e5',
        base: '#f97316',
        mode: 'analogous',
        tone: 'balanced',
        swatches: ['#fde68a', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd'],
      }),
    ).toBe(false)
    expect(palette.error.value).toBe('El color base compartido no está anclado.')
  })

  it('rechaza modo, tono o swatches inválidos en una paleta compartida', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const shared = {
      sourceBase: '#4f46e5' as const,
      base: '#4f46e5' as const,
      mode: 'analogous' as const,
      tone: 'balanced' as const,
      swatches: ['#fde68a', '#fca5a5', '#4f46e5', '#c4b5fd', '#93c5fd'] as Hex[],
    }

    expect(palette.applySharedPalette({ ...shared, mode: 'tetradic' as never })).toBe(false)
    expect(palette.error.value).toBe('La paleta compartida es inválida.')

    expect(palette.applySharedPalette({ ...shared, tone: 'neon' as never })).toBe(false)
    expect(palette.error.value).toBe('La paleta compartida es inválida.')

    expect(palette.applySharedPalette({ ...shared, swatches: ['#fff'] as Hex[] })).toBe(false)
    expect(palette.error.value).toBe('La paleta compartida es inválida.')
  })

  it('rechaza interpretaciones inválidas sin tocar la paleta', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const before = hexes(palette.swatches.value)

    expect(palette.applyInterpretation({ base: 'nope', mode: 'analogous' })).toBe(false)
    expect(palette.error.value).toBe('HEX inválido. Usa #rrggbb.')

    expect(
      palette.applyInterpretation({
        base: '#f97316',
        mode: 'tetradic' as HarmonyMode,
      }),
    ).toBe(false)
    expect(palette.error.value).toBe('Modo de armonía inválido.')

    expect(
      palette.applyInterpretation({
        base: '#f97316',
        mode: 'analogous',
        tone: 'neon' as PaletteTone,
      }),
    ).toBe(false)
    expect(palette.error.value).toBe('Tono inválido.')

    expect(hexes(palette.swatches.value)).toEqual(before)
  })

  it('regenera solo los swatches libres', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'random', seed: 42 })
    const lockedId = palette.swatches.value[1].id
    const lockedHex = palette.swatches.value[1].hex
    const baseHex = palette.swatches.value[BASE_INDEX].hex
    const before = hexes(palette.swatches.value)

    palette.toggleLock(lockedId)
    palette.regenerate()

    expect(palette.swatches.value[BASE_INDEX].hex).toBe(baseHex)
    expect(palette.swatches.value[1].hex).toBe(lockedHex)

    const changedFree = palette.swatches.value.filter(
      (swatch, index) => index !== BASE_INDEX && !swatch.locked && swatch.hex !== before[index],
    )

    expect(changedFree.length).toBeGreaterThan(0)
  })

  it('no regenera si todos los swatches generados están bloqueados', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'random', seed: 42 })

    for (const index of [0, 1, 3, 4]) {
      palette.toggleLock(palette.swatches.value[index].id)
    }

    const before = hexes(palette.swatches.value)
    expect(palette.canRegenerate.value).toBe(false)

    palette.regenerate()

    expect(hexes(palette.swatches.value)).toEqual(before)
  })

  it('no permite bloquear el color base', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const baseId = palette.swatches.value[BASE_INDEX].id

    palette.toggleLock(baseId)

    expect(palette.swatches.value[BASE_INDEX].locked).toBe(true)
    expect(palette.lockedGeneratedCount.value).toBe(0)
  })

  it('cuenta solo los locks generados', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })

    palette.toggleLock(palette.swatches.value[0].id)
    palette.toggleLock(palette.swatches.value[3].id)

    expect(palette.lockedCount.value).toBe(3)
    expect(palette.lockedGeneratedCount.value).toBe(2)
  })

  it('aplica un preset y conserva los locks generados', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const preset = PRESETS[0]

    palette.toggleLock(palette.swatches.value[0].id)
    palette.applyPreset(preset)

    expect(palette.sourceBase.value).toBe(preset.base)
    expect(palette.base.value).toBe(adaptBaseToTone(preset.base, preset.tone ?? 'balanced'))
    expect(palette.mode.value).toBe(preset.mode)
    expect(palette.tone.value).toBe(preset.tone ?? 'balanced')
    expect(palette.selectedPresetId.value).toBe(preset.id)
    expect(palette.swatches.value[BASE_INDEX].hex).toBe(palette.base.value)
    expect(palette.lockedGeneratedCount.value).toBe(1)
  })

  it('aleatoriza la base dentro del tono activo', () => {
    const palette = usePalette({
      base: '#4f46e5',
      mode: 'analogous',
      tone: 'dark',
      seed: 42,
    })

    palette.randomizeBase()

    const hsl = hexToHsl(palette.base.value)
    // El redondeo HEX puede moverse unas centésimas fuera del rango HSL.
    expect(hsl.l).toBeGreaterThanOrEqual(11.9)
    expect(hsl.l).toBeLessThanOrEqual(32.1)
  })

  it('aplica el tono definido por un preset y adapta el base', () => {
    const palette = usePalette({ base: '#4f46e5', mode: 'analogous', seed: 42 })
    const preset = { ...PRESETS[0], tone: 'pastel' as const }

    palette.applyPreset(preset)

    expect(palette.tone.value).toBe('pastel')
    expect(palette.sourceBase.value).toBe(preset.base)
    expect(palette.base.value).toBe(adaptBaseToTone(preset.base, 'pastel'))
  })

  it('aleatoriza la base usando la fábrica inyectada', () => {
    const palette = usePalette({
      base: '#4f46e5',
      mode: 'analogous',
      seed: 42,
      randomBase: () => '#f97316',
    })

    palette.randomizeBase()

    expect(palette.base.value).toBe('#f97316')
    expect(palette.swatches.value[BASE_INDEX].hex).toBe('#f97316')
    expect(palette.selectedPresetId.value).toBeNull()
  })
})
