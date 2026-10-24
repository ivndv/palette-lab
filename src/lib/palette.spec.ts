// Pruebas de generación, tonos, locks y unicidad

import { afterEach, describe, expect, it, vi } from 'vitest'
import { type Hex, hexToHsl, hslToHex, normalizeHex } from './color'
import {
  adaptBaseToTone,
  BASE_INDEX,
  canRegenerate,
  createPaletteState,
  createSeed,
  createSwatchesFromHexes,
  DEFAULT_TONE,
  generatePalette,
  HARMONY_MODES,
  type HarmonyMode,
  hueOffsets,
  isHarmonyMode,
  isPaletteTone,
  lightnessSteps,
  lockedCount,
  mulberry32,
  PALETTE_TONES,
  type PaletteTone,
  rebuildPalette,
  regenerateUnlocked,
  SWATCH_COUNT,
  type Swatch,
  seedFromString,
  toggleLock,
  toneProfile,
} from './palette'
import { DEFAULT_PRESET, PRESETS } from './presets'

const BASE: Hex = '#4f46e5'

function hexes(swatches: Swatch[]): Hex[] {
  return swatches.map((swatch) => swatch.hex)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HARMONY_MODES', () => {
  it('define los cinco modos del MVP', () => {
    expect(HARMONY_MODES).toHaveLength(5)
    expect(new Set(HARMONY_MODES.map((mode) => mode.id)).size).toBe(5)

    for (const mode of HARMONY_MODES) {
      expect(mode.label.length).toBeGreaterThan(0)
      expect(mode.description.length).toBeGreaterThan(0)
    }
  })

  it('reconoce solo modos válidos', () => {
    for (const mode of HARMONY_MODES) {
      expect(isHarmonyMode(mode.id)).toBe(true)
    }

    expect(isHarmonyMode('tetradic')).toBe(false)
    expect(isHarmonyMode(null)).toBe(false)
    expect(isHarmonyMode(42)).toBe(false)
  })
})

describe('PALETTE_TONES', () => {
  it('define los seis tonos del generador', () => {
    expect(PALETTE_TONES).toHaveLength(6)
    expect(new Set(PALETTE_TONES.map((tone) => tone.id)).size).toBe(6)
    expect(PALETTE_TONES[0].id).toBe(DEFAULT_TONE)

    for (const tone of PALETTE_TONES) {
      expect(tone.label.length).toBeGreaterThan(0)
      expect(tone.description.length).toBeGreaterThan(0)
    }
  })

  it('reconoce solo tonos válidos', () => {
    for (const tone of PALETTE_TONES) {
      expect(isPaletteTone(tone.id)).toBe(true)
    }

    expect(isPaletteTone('neon')).toBe(false)
    expect(isPaletteTone(null)).toBe(false)
    expect(isPaletteTone(42)).toBe(false)
  })

  it('expone perfiles de aleatoriedad coherentes con cada tono', () => {
    for (const tone of PALETTE_TONES) {
      const profile = toneProfile(tone.id)

      expect(profile.saturation.min).toBeLessThanOrEqual(profile.saturation.max)
      expect(profile.lightness.min).toBeLessThanOrEqual(profile.lightness.max)
    }
  })
})

describe('hueOffsets', () => {
  it('devuelve los offsets de cada modo', () => {
    expect(hueOffsets('analogous')).toEqual([-30, -15, 0, 15, 30])
    expect(hueOffsets('complementary')).toEqual([-15, 15, 0, 165, 195])
    expect(hueOffsets('triadic')).toEqual([-15, 15, 0, 120, 240])
    expect(hueOffsets('monochrome')).toEqual([0, 0, 0, 0, 0])
  })

  it('genera offsets aleatorios deterministas y separados', () => {
    const first = hueOffsets('random', 42)
    const second = hueOffsets('random', 42)

    expect(first).toEqual(second)
    expect(first).toHaveLength(SWATCH_COUNT)
    expect(first[BASE_INDEX]).toBe(0)
    expect(first.every((offset) => offset >= -60 && offset <= 60)).toBe(true)

    for (let index = 0; index < first.length; index += 1) {
      for (let other = index + 1; other < first.length; other += 1) {
        expect(Math.abs(first[index] - first[other])).toBeGreaterThanOrEqual(20)
      }
    }
  })

  it('usa una semilla aleatoria cuando no se pasa seed', () => {
    const offsets = hueOffsets('random')

    expect(offsets).toHaveLength(SWATCH_COUNT)
    expect(offsets[BASE_INDEX]).toBe(0)
  })

  it('lanza un error con un modo inválido', () => {
    expect(() => hueOffsets('tetradic' as HarmonyMode)).toThrow('Modo de armonía inválido')
  })
})

describe('lightnessSteps', () => {
  it('reparte la luminosidad alrededor del base', () => {
    expect(lightnessSteps(50)).toEqual([24, 37, 50, 63, 76])
    expect(lightnessSteps(20)).toEqual([26, 36, 20, 50, 64])
    expect(lightnessSteps(90)).toEqual([46, 60, 90, 74, 84])
  })

  it('mantiene el base en el índice central y limita los extremos', () => {
    expect(lightnessSteps(0)).toEqual([8, 16, 0, 30, 44])
    expect(lightnessSteps(100)).toEqual([56, 70, 100, 84, 94])
    expect(lightnessSteps(30)).toEqual([8, 17, 30, 43, 56])
    expect(lightnessSteps(70)).toEqual([44, 57, 70, 83, 96])

    for (const base of [0, 20, 50, 70, 90, 100]) {
      const steps = lightnessSteps(base)
      expect(steps[BASE_INDEX]).toBe(base)

      steps.forEach((step, index) => {
        if (index !== BASE_INDEX) {
          expect(step).toBeGreaterThanOrEqual(8)
          expect(step).toBeLessThanOrEqual(96)
        }
      })
    }
  })
})

describe('lightnessSteps con tono', () => {
  const expectedRanges: Record<Exclude<PaletteTone, 'balanced'>, [number, number]> = {
    pastel: [72, 92],
    vivid: [45, 62],
    muted: [40, 60],
    dark: [12, 32],
    light: [72, 92],
  }

  it('mantiene el base y limita los derivados al rango del tono', () => {
    for (const [tone, [min, max]] of Object.entries(expectedRanges)) {
      const steps = lightnessSteps(50, tone as PaletteTone)

      expect(steps).toHaveLength(SWATCH_COUNT)
      expect(steps[BASE_INDEX]).toBe(50)

      steps.forEach((step, index) => {
        if (index !== BASE_INDEX) {
          expect(step).toBeGreaterThanOrEqual(min)
          expect(step).toBeLessThanOrEqual(max)
        }
      })
    }
  })

  it('evita repetir la luminosidad del base y de los otros swatches', () => {
    for (const tone of ['pastel', 'vivid', 'muted', 'dark', 'light'] as PaletteTone[]) {
      const steps = lightnessSteps(50, tone)
      const derived = steps.filter((_, index) => index !== BASE_INDEX)
      const unique = new Set([...derived, steps[BASE_INDEX]])

      expect(unique.size).toBe(SWATCH_COUNT)
    }
  })
})

describe('adaptBaseToTone', () => {
  it('devuelve el base exacto en tono equilibrado', () => {
    expect(adaptBaseToTone('#ABC' as Hex, 'balanced')).toBe('#aabbcc')
  })

  it('adapta saturación y luminosidad sin cambiar el hue', () => {
    const original = hexToHsl('#4f46e5')
    const adapted = adaptBaseToTone('#4f46e5', 'pastel')
    const hsl = hexToHsl(adapted)

    expect(hsl.h).toBeCloseTo(original.h, 0)
    expect(hsl.s).toBeGreaterThanOrEqual(44)
    expect(hsl.s).toBeLessThanOrEqual(46)
    expect(hsl.l).toBeGreaterThanOrEqual(71)
    expect(hsl.l).toBeLessThanOrEqual(73)
  })

  it('mantiene los grises sin saturación', () => {
    const adapted = adaptBaseToTone('#808080', 'dark')
    const hsl = hexToHsl(adapted)

    expect(hsl.s).toBe(0)
    expect(hsl.l).toBeGreaterThanOrEqual(12)
    expect(hsl.l).toBeLessThanOrEqual(33)
  })

  it('lanza un error con base o tono inválidos', () => {
    expect(() => adaptBaseToTone('#nope' as Hex, 'pastel')).toThrow('Color base inválido')
    expect(() => adaptBaseToTone('#4f46e5', 'neon' as PaletteTone)).toThrow('Tono inválido')
  })
})

describe('mulberry32', () => {
  it('es determinista y devuelve valores en [0, 1)', () => {
    const first = mulberry32(42)
    const second = mulberry32(42)

    for (let index = 0; index < 10; index += 1) {
      const value = first()
      expect(value).toBe(second())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('createSeed', () => {
  it('devuelve un entero de 32 bits', () => {
    const seed = createSeed()

    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(0xffffffff)
  })

  it('funciona sin crypto disponible', () => {
    vi.stubGlobal('crypto', {})

    const seed = createSeed()

    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('seedFromString', () => {
  it('es determinista y devuelve un entero de 32 bits', () => {
    const first = seedFromString('café artesanal')
    const second = seedFromString('café artesanal')

    expect(first).toBe(second)
    expect(Number.isInteger(first)).toBe(true)
    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThanOrEqual(0xffffffff)
  })

  it('normaliza espacios y mayúsculas', () => {
    expect(seedFromString('  Café Artesanal ')).toBe(seedFromString('café artesanal'))
  })

  it('cambia con textos distintos', () => {
    expect(seedFromString('café')).not.toBe(seedFromString('playa'))
  })
})

describe('generatePalette', () => {
  it('genera cinco swatches con el base anclado en el centro', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })

    expect(palette).toHaveLength(SWATCH_COUNT)
    expect(palette[BASE_INDEX].hex).toBe(BASE)
    expect(palette[BASE_INDEX].locked).toBe(true)
    expect(palette.filter((swatch) => swatch.locked)).toHaveLength(1)
    expect(palette.every((swatch) => normalizeHex(swatch.hex) === swatch.hex)).toBe(true)
    expect(palette.every((swatch) => swatch.id.length > 0)).toBe(true)
    expect(new Set(palette.map((swatch) => swatch.id)).size).toBe(SWATCH_COUNT)
  })

  it('es determinista para la misma base, modo y seed', () => {
    const first = generatePalette({ base: BASE, mode: 'random', seed: 42 })
    const second = generatePalette({ base: BASE, mode: 'random', seed: 42 })

    expect(hexes(first)).toEqual(hexes(second))
  })

  it('varía la paleta con otra seed también en modos armónicos', () => {
    const first = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })
    const second = generatePalette({ base: BASE, mode: 'analogous', seed: 99 })

    expect(hexes(first)).not.toEqual(hexes(second))
    expect(first[BASE_INDEX].hex).toBe(second[BASE_INDEX].hex)
  })

  it('normaliza el color base', () => {
    const palette = generatePalette({ base: '#ABC' as Hex, mode: 'analogous', seed: 42 })

    expect(palette[BASE_INDEX].hex).toBe('#aabbcc')
  })

  it('mantiene grises en modo monocromático', () => {
    const palette = generatePalette({ base: '#808080', mode: 'monochrome', seed: 42 })

    for (const swatch of palette) {
      expect(hexToHsl(swatch.hex).s).toBe(0)
    }
  })

  it('usa una seed aleatoria si no se pasa una', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: Number.NaN })

    expect(palette).toHaveLength(SWATCH_COUNT)
  })

  it('genera paletas con cada tono y mantiene el base intacto', () => {
    const bases: Record<Exclude<PaletteTone, 'balanced'>, Hex> = {
      pastel: hslToHex({ h: 330, s: 35, l: 82 }),
      vivid: hslToHex({ h: 280, s: 95, l: 55 }),
      muted: hslToHex({ h: 210, s: 30, l: 50 }),
      dark: hslToHex({ h: 250, s: 55, l: 20 }),
      light: hslToHex({ h: 200, s: 55, l: 82 }),
    }

    const ranges: Record<Exclude<PaletteTone, 'balanced'>, [number, number, number, number]> = {
      pastel: [25, 45, 72, 92],
      vivid: [85, 100, 45, 62],
      muted: [20, 40, 40, 60],
      dark: [40, 70, 12, 32],
      light: [40, 70, 72, 92],
    }

    for (const [tone, base] of Object.entries(bases)) {
      const palette = generatePalette({
        base,
        mode: 'analogous',
        tone: tone as PaletteTone,
        seed: 42,
      })
      const [minS, maxS, minL, maxL] = ranges[tone as Exclude<PaletteTone, 'balanced'>]

      expect(palette[BASE_INDEX].hex).toBe(base)

      palette.forEach((swatch, index) => {
        if (index === BASE_INDEX) {
          return
        }

        const hsl = hexToHsl(swatch.hex)
        expect(hsl.s).toBeGreaterThanOrEqual(minS - 1)
        expect(hsl.s).toBeLessThanOrEqual(maxS + 1)
        expect(hsl.l).toBeGreaterThanOrEqual(minL - 1)
        expect(hsl.l).toBeLessThanOrEqual(maxL + 1)
      })
    }
  })

  it('aplica el tono también en modo monocromático', () => {
    const base = hslToHex({ h: 220, s: 35, l: 82 })
    const palette = generatePalette({
      base,
      mode: 'monochrome',
      tone: 'pastel',
      seed: 42,
    })

    for (const swatch of palette) {
      const hsl = hexToHsl(swatch.hex)
      expect(hsl.s).toBeGreaterThanOrEqual(24)
      expect(hsl.s).toBeLessThanOrEqual(46)
    }

    const gray = generatePalette({
      base: '#808080',
      mode: 'monochrome',
      tone: 'dark',
      seed: 42,
    })

    for (const swatch of gray) {
      expect(hexToHsl(swatch.hex).s).toBe(0)
    }
  })

  it('conserva la salida equilibrada cuando no se pasa tono', () => {
    const withDefault = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })
    const withBalanced = generatePalette({
      base: BASE,
      mode: 'analogous',
      tone: 'balanced',
      seed: 42,
    })

    expect(hexes(withDefault)).toEqual(hexes(withBalanced))
  })

  it('varía la paleta con la seed también en tonos', () => {
    const first = generatePalette({ base: BASE, mode: 'analogous', tone: 'pastel', seed: 42 })
    const second = generatePalette({ base: BASE, mode: 'analogous', tone: 'pastel', seed: 99 })

    expect(hexes(first)).not.toEqual(hexes(second))
    expect(first[BASE_INDEX].hex).toBe(second[BASE_INDEX].hex)
  })

  it('garantiza cinco HEX únicos en todos los modos y tonos', () => {
    const bases: Hex[] = ['#4f46e5', '#808080', '#fef3c7', '#111827', '#f97316']

    for (const base of bases) {
      for (const mode of HARMONY_MODES) {
        for (const tone of PALETTE_TONES) {
          for (const seed of [1, 42, 99]) {
            const palette = generatePalette({ base, mode: mode.id, tone: tone.id, seed })
            const unique = new Set(hexes(palette))

            expect(unique.size).toBe(SWATCH_COUNT)
            expect(palette[BASE_INDEX].hex).toBe(base)
          }
        }
      }
    }
  })

  it('lanza un error con base, modo o tono inválidos', () => {
    expect(() => generatePalette({ base: '#nope' as Hex, mode: 'analogous' })).toThrow(
      'Color base inválido',
    )
    expect(() => generatePalette({ base: BASE, mode: 'tetradic' as HarmonyMode })).toThrow(
      'Modo de armonía inválido',
    )
    expect(() =>
      generatePalette({ base: BASE, mode: 'analogous', tone: 'neon' as PaletteTone }),
    ).toThrow('Tono inválido')
  })

  it('funciona sin crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {})

    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })

    expect(palette).toHaveLength(SWATCH_COUNT)
    expect(palette.every((swatch) => swatch.id.startsWith('swatch-'))).toBe(true)
  })
})

describe('regenerateUnlocked', () => {
  it('conserva base y locks, y cambia solo los libres', () => {
    const palette = generatePalette({ base: BASE, mode: 'random', seed: 42 })
    const locked = toggleLock(palette, palette[1].id)
    const next = regenerateUnlocked(locked, { base: BASE, mode: 'random', seed: 99 })

    expect(next[BASE_INDEX].hex).toBe(palette[BASE_INDEX].hex)
    expect(next[1].hex).toBe(palette[1].hex)

    const changedFreeSwatches = next.filter(
      (swatch, index) =>
        index !== BASE_INDEX && !swatch.locked && swatch.hex !== palette[index].hex,
    )

    expect(changedFreeSwatches.length).toBeGreaterThan(0)
    expect(next.map((swatch) => swatch.id)).toEqual(palette.map((swatch) => swatch.id))
  })

  it('regenera también en modos armónicos deterministas', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })
    const locked = toggleLock(palette, palette[1].id)
    const next = regenerateUnlocked(locked, { base: BASE, mode: 'analogous', seed: 99 })

    expect(next[BASE_INDEX].hex).toBe(BASE)
    expect(next[1].hex).toBe(locked[1].hex)

    const changedFree = next.filter(
      (swatch, index) =>
        index !== BASE_INDEX && !swatch.locked && swatch.hex !== palette[index].hex,
    )

    expect(changedFree.length).toBeGreaterThan(0)
  })

  it('no cambia nada si todos los swatches generados están bloqueados', () => {
    const palette = generatePalette({ base: BASE, mode: 'random', seed: 42 })
    const allLocked = [0, 1, 3, 4].reduce(
      (current, index) => toggleLock(current, current[index].id),
      palette,
    )

    const next = regenerateUnlocked(allLocked, { base: BASE, mode: 'random', seed: 99 })

    expect(hexes(next)).toEqual(hexes(allLocked))
  })

  it('conserva el base aunque su lock esté desactivado', () => {
    const palette = generatePalette({ base: BASE, mode: 'random', seed: 42 })
    const unlockedBase = palette.map((swatch, index) =>
      index === BASE_INDEX ? { ...swatch, locked: false } : swatch,
    )

    const next = regenerateUnlocked(unlockedBase, { base: BASE, mode: 'random', seed: 99 })

    expect(next[BASE_INDEX].hex).toBe(BASE)
  })

  it('lanza un error si la paleta no tiene cinco swatches', () => {
    expect(() => regenerateUnlocked([], { base: BASE, mode: 'analogous' })).toThrow(
      'La paleta debe tener 5 swatches',
    )
  })
})

describe('rebuildPalette', () => {
  it('cambia el base y conserva locks e IDs', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })
    const locked = toggleLock(palette, palette[0].id)
    const next = rebuildPalette(locked, {
      base: '#f97316',
      mode: 'triadic',
      seed: 99,
    })

    expect(next[BASE_INDEX].hex).toBe('#f97316')
    expect(next[BASE_INDEX].locked).toBe(true)
    expect(next[0].hex).toBe(locked[0].hex)
    expect(next[0].locked).toBe(true)
    expect(next.map((swatch) => swatch.id)).toEqual(palette.map((swatch) => swatch.id))
  })

  it('reinicia locks cuando preserveLocks es false', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })
    const locked = toggleLock(palette, palette[1].id)
    const next = rebuildPalette(locked, { base: '#f97316', mode: 'triadic', seed: 99 }, false)

    expect(next[BASE_INDEX].hex).toBe('#f97316')
    expect(next[BASE_INDEX].locked).toBe(true)
    expect(next.filter((swatch) => swatch.locked)).toHaveLength(1)
  })

  it('tolera huecos en la paleta', () => {
    const sparse = new Array<Swatch>(SWATCH_COUNT)
    const next = rebuildPalette(sparse, { base: BASE, mode: 'analogous', seed: 42 })

    expect(next).toHaveLength(SWATCH_COUNT)
  })

  it('lanza un error si la paleta no tiene cinco swatches', () => {
    expect(() => rebuildPalette([], { base: BASE, mode: 'analogous' })).toThrow(
      'La paleta debe tener 5 swatches',
    )
  })
})

describe('toggleLock', () => {
  it('alterna el lock de un swatch generado', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })
    const locked = toggleLock(palette, palette[0].id)

    expect(locked[0].locked).toBe(true)
    expect(palette[0].locked).toBe(false)

    const unlocked = toggleLock(locked, locked[0].id)
    expect(unlocked[0].locked).toBe(false)
  })

  it('no cambia el base ni un id inexistente', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })

    expect(toggleLock(palette, palette[BASE_INDEX].id)).toBe(palette)
    expect(toggleLock(palette, 'no-existe')).toBe(palette)
  })
})

describe('canRegenerate y lockedCount', () => {
  it('permite regenerar mientras haya swatches libres', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })

    expect(canRegenerate(palette)).toBe(true)
    expect(lockedCount(palette)).toBe(1)
  })

  it('deshabilita regenerar cuando todos los generados están bloqueados', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 })
    const allLocked = [0, 1, 3, 4].reduce(
      (current, index) => toggleLock(current, current[index].id),
      palette,
    )

    expect(canRegenerate(allLocked)).toBe(false)
    expect(lockedCount(allLocked)).toBe(SWATCH_COUNT)
  })

  it('ignora el lock del base para decidir si puede regenerar', () => {
    const palette = generatePalette({ base: BASE, mode: 'analogous', seed: 42 }).map(
      (swatch, index) => (index === BASE_INDEX ? { ...swatch, locked: false } : swatch),
    )

    expect(canRegenerate(palette)).toBe(true)
  })
})

describe('createSwatchesFromHexes', () => {
  it('crea cinco swatches con el base bloqueado', () => {
    const swatches = createSwatchesFromHexes([
      '#fde68a',
      '#fca5a5',
      '#f9a8d4',
      '#c4b5fd',
      '#93c5fd',
    ])

    expect(swatches).toHaveLength(SWATCH_COUNT)
    expect(swatches[BASE_INDEX].hex).toBe('#f9a8d4')
    expect(swatches[BASE_INDEX].locked).toBe(true)
    expect(swatches.filter((swatch) => swatch.locked)).toHaveLength(1)
    expect(new Set(swatches.map((swatch) => swatch.id)).size).toBe(SWATCH_COUNT)
  })

  it('normaliza y rechaza paletas inválidas', () => {
    const swatches = createSwatchesFromHexes([
      '#FDE68A',
      '#FCA5A5',
      '#F9A8D4',
      '#C4B5FD',
      '#93C5FD',
    ])

    expect(swatches[0].hex).toBe('#fde68a')
    expect(() => createSwatchesFromHexes(['#fff'])).toThrow('La paleta debe tener 5 colores')
    expect(() =>
      createSwatchesFromHexes(['#nope', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd']),
    ).toThrow('La paleta contiene un HEX inválido')
  })
})

describe('createPaletteState', () => {
  it('crea un estado versionado con tono equilibrado por defecto', () => {
    const state = createPaletteState('#ABC' as Hex, 'triadic', 42)

    expect(state.version).toBe(3)
    expect(state.base).toBe('#aabbcc')
    expect(state.sourceBase).toBe('#aabbcc')
    expect(state.mode).toBe('triadic')
    expect(state.tone).toBe('balanced')
    expect(state.swatches).toHaveLength(SWATCH_COUNT)
  })

  it('adapta el base a un tono explícito y conserva el original', () => {
    const state = createPaletteState('#4f46e5', 'analogous', 42, 'pastel')

    expect(state.tone).toBe('pastel')
    expect(state.sourceBase).toBe('#4f46e5')
    expect(state.base).toBe(adaptBaseToTone('#4f46e5', 'pastel'))
    expect(state.swatches[BASE_INDEX].hex).toBe(state.base)
  })

  it('lanza un error con base inválida', () => {
    expect(() => createPaletteState('#nope' as Hex, 'analogous')).toThrow('Color base inválido')
  })
})

describe('presets', () => {
  it('tiene presets válidos y únicos', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(6)
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length)

    for (const preset of PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0)
      expect(normalizeHex(preset.base)).toBe(preset.base)
      expect(isHarmonyMode(preset.mode)).toBe(true)

      if (preset.tone) {
        expect(isPaletteTone(preset.tone)).toBe(true)
      }
    }
  })

  it('expone un preset por defecto', () => {
    expect(DEFAULT_PRESET).toBe(PRESETS[1])
  })
})
