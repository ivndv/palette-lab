// Generación de paletas: armonías, tonos, locks y unicidad de HEX

import { type Hex, hexToHsl, hslToHex, normalizeHex, wrapHue } from './color'

// Armonías disponibles en la interfaz
export type HarmonyMode = 'analogous' | 'complementary' | 'triadic' | 'monochrome' | 'random'

// Tonos que ajustan saturación y luminosidad
export type PaletteTone = 'balanced' | 'pastel' | 'vivid' | 'muted' | 'dark' | 'light'

// Color de la paleta con su estado de bloqueo
export interface Swatch {
  id: string
  hex: Hex
  locked: boolean
}

// Estado persistible de la paleta
export interface PaletteState {
  version: 3
  base: Hex
  sourceBase: Hex
  mode: HarmonyMode
  tone: PaletteTone
  swatches: Swatch[]
}

// Entrada del generador
export interface GenerateOptions {
  base: Hex
  mode: HarmonyMode
  tone?: PaletteTone
  seed?: number
}

// Metadatos para el selector de armonía
export interface HarmonyModeInfo {
  id: HarmonyMode
  label: string
  description: string
}

// Metadatos para el selector de tono
export interface PaletteToneInfo {
  id: PaletteTone
  label: string
  description: string
}

// Rango cerrado de saturación o luminosidad
export interface ToneRange {
  min: number
  max: number
}

// Perfil de un tono
export interface ToneProfile {
  saturation: ToneRange
  lightness: ToneRange
}

// Cinco colores por paleta, con el base siempre en el centro
export const SWATCH_COUNT = 5
export const BASE_INDEX = 2
export const DEFAULT_TONE: PaletteTone = 'balanced'

export const HARMONY_MODES: HarmonyModeInfo[] = [
  {
    id: 'analogous',
    label: 'Análoga',
    description: 'Tonos cercanos al color base.',
  },
  {
    id: 'complementary',
    label: 'Complementaria dividida',
    description: 'El color base y dos tonos alrededor de su opuesto.',
  },
  {
    id: 'triadic',
    label: 'Tríada',
    description: 'Tres tonos equidistantes en el círculo cromático.',
  },
  {
    id: 'monochrome',
    label: 'Monocromática',
    description: 'Un solo tono con variaciones de luminosidad.',
  },
  {
    id: 'random',
    label: 'Aleatoria',
    description: 'Tonos aleatorios con separación controlada.',
  },
]

export const PALETTE_TONES: PaletteToneInfo[] = [
  {
    id: 'balanced',
    label: 'Equilibrado',
    description: 'Saturación y luminosidad balanceadas.',
  },
  {
    id: 'pastel',
    label: 'Pastel',
    description: 'Colores suaves y luminosos.',
  },
  {
    id: 'vivid',
    label: 'Vívido',
    description: 'Alta saturación y contraste energético.',
  },
  {
    id: 'muted',
    label: 'Sobrio',
    description: 'Tonos apagados y contenidos.',
  },
  {
    id: 'dark',
    label: 'Oscuro',
    description: 'Luminosidad baja y ambiente nocturno.',
  },
  {
    id: 'light',
    label: 'Claro',
    description: 'Luminosidad alta y sensación aireada.',
  },
]

// Balanced no tiene perfil fijo: se calcula desde el color base
const TONE_PROFILES: Record<Exclude<PaletteTone, 'balanced'>, ToneProfile> = {
  pastel: {
    saturation: { min: 25, max: 45 },
    lightness: { min: 72, max: 92 },
  },
  vivid: {
    saturation: { min: 85, max: 100 },
    lightness: { min: 45, max: 62 },
  },
  muted: {
    saturation: { min: 20, max: 40 },
    lightness: { min: 40, max: 60 },
  },
  dark: {
    saturation: { min: 40, max: 70 },
    lightness: { min: 12, max: 32 },
  },
  light: {
    saturation: { min: 40, max: 70 },
    lightness: { min: 72, max: 92 },
  },
}

// Balanced también necesita un perfil cuando el modo es aleatorio
const RANDOM_TONE_PROFILES: Record<PaletteTone, ToneProfile> = {
  balanced: {
    saturation: { min: 65, max: 85 },
    lightness: { min: 45, max: 65 },
  },
  ...TONE_PROFILES,
}

// Variaciones de saturación entre swatches
const SATURATION_DELTAS = [-8, -4, 0, 4, 8]

// Limita un valor a un rango cerrado
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ID estable para React y tests; cae a timestamp si no hay randomUUID
function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `swatch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Usa la semilla recibida o genera una nueva
function resolveSeed(seed?: number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0
  }

  return createSeed()
}

// Saturación de cada swatch según modo y tono
function saturationFor(
  mode: HarmonyMode,
  baseSaturation: number,
  index: number,
  tone: PaletteTone,
): number {
  if (tone === 'balanced') {
    // En monocromático se respeta la saturación original
    if (mode === 'monochrome') {
      return clamp(baseSaturation, 0, 100)
    }

    return clamp(baseSaturation + SATURATION_DELTAS[index], 55, 80)
  }

  const profile = TONE_PROFILES[tone]

  if (mode === 'monochrome') {
    // Los grises se quedan sin saturación
    if (baseSaturation === 0) {
      return 0
    }

    return clamp(baseSaturation, profile.saturation.min, profile.saturation.max)
  }

  const anchor = clamp(baseSaturation, profile.saturation.min, profile.saturation.max)

  return clamp(anchor + SATURATION_DELTAS[index], profile.saturation.min, profile.saturation.max)
}

// Offsets de hue aleatorios con separación mínima
function randomHueOffsets(seed: number): number[] {
  const rng = mulberry32(seed)
  const slots = [-55, -25, 25, 55]
  const offsets = slots.map((slot) => clamp(Math.round(slot + (rng() * 10 - 5)), -60, 60))

  // El base va al centro con offset 0
  return [...offsets.slice(0, 2), 0, ...offsets.slice(2)]
}

// Distribuye cuatro luminosidades dentro del rango del tono
function toneLightness(range: ToneRange): number[] {
  const span = range.max - range.min

  return [0.1, 0.3, 0.7, 0.9].map((ratio) => clamp(Math.round(range.min + span * ratio), 0, 100))
}

// Evita luminosidades repetidas sin salir del rango
function ensureDistinctLightness(values: number[], base: number, range: ToneRange): number[] {
  const used = new Set<number>([base])

  return values.map((value, index) => {
    if (index === BASE_INDEX) {
      return value
    }

    let candidate = value

    if (used.has(candidate)) {
      for (let offset = 1; offset <= 8; offset += 1) {
        const up = clamp(candidate + offset, range.min, range.max)
        const down = clamp(candidate - offset, range.min, range.max)

        if (!used.has(up)) {
          candidate = up
          break
        }

        if (!used.has(down)) {
          candidate = down
          break
        }
      }
    }

    used.add(candidate)

    return candidate
  })
}

// Garantiza cinco HEX distintos respetando locks y base
function ensureUniqueHexes(swatches: Swatch[], tone: PaletteTone): Swatch[] {
  const result = swatches.map((swatch) => ({ ...swatch }))
  const used = new Set<Hex>()

  // Los locked y el base son intocables: se reservan primero
  for (let index = 0; index < result.length; index += 1) {
    const swatch = result[index]

    if (index === BASE_INDEX || swatch.locked) {
      used.add(swatch.hex)
    }
  }

  const profile = tone === 'balanced' ? null : TONE_PROFILES[tone]
  const minL = profile?.lightness.min ?? 8
  const maxL = profile?.lightness.max ?? 96

  for (let index = 0; index < result.length; index += 1) {
    if (index === BASE_INDEX || result[index].locked) {
      continue
    }

    const swatch = result[index]

    if (!used.has(swatch.hex)) {
      used.add(swatch.hex)
      continue
    }

    const hsl = hexToHsl(swatch.hex)
    let candidate: Hex | null = null

    // Ajusta solo luminosidad: mantiene hue y saturación
    for (let delta = 1; delta <= 24 && !candidate; delta += 1) {
      for (const sign of [1, -1]) {
        const hex = hslToHex({
          h: hsl.h,
          s: hsl.s,
          l: clamp(hsl.l + delta * sign, minL, maxL),
        })

        if (!used.has(hex)) {
          candidate = hex
          break
        }
      }
    }

    if (candidate) {
      result[index] = { ...swatch, hex: candidate }
      used.add(candidate)
    } else {
      used.add(swatch.hex)
    }
  }

  return result
}

// Semilla nueva para cada regeneración
export function createSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return values[0]
  }

  return Math.floor(Math.random() * 0x1_0000_0000)
}

// Semilla reproducible a partir de un texto (FNV-1a)
export function seedFromString(value: string): number {
  const normalized = value.trim().toLowerCase()
  let hash = 0x811c9dc5

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return hash >>> 0
}

// PRNG determinista para que una semilla siempre dé la misma paleta
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

// Guardas para datos que llegan de la URL o del almacenamiento
export function isHarmonyMode(value: unknown): value is HarmonyMode {
  return HARMONY_MODES.some((mode) => mode.id === value)
}

export function isPaletteTone(value: unknown): value is PaletteTone {
  return PALETTE_TONES.some((tone) => tone.id === value)
}

// Perfil completo del tono, incluido balanced
export function toneProfile(tone: PaletteTone): ToneProfile {
  return RANDOM_TONE_PROFILES[tone]
}

// Ajusta el base para que entre en el rango del tono
export function adaptBaseToTone(base: Hex, tone: PaletteTone = DEFAULT_TONE): Hex {
  const normalizedBase = normalizeHex(base)

  if (!normalizedBase) {
    throw new Error(`Color base inválido: ${base}`)
  }

  if (!isPaletteTone(tone)) {
    throw new Error(`Tono inválido: ${tone}`)
  }

  // Balanced no altera el color original
  if (tone === 'balanced') {
    return normalizedBase
  }

  const profile = TONE_PROFILES[tone]
  const hsl = hexToHsl(normalizedBase)
  const saturation = hsl.s === 0 ? 0 : clamp(hsl.s, profile.saturation.min, profile.saturation.max)
  const lightness = clamp(hsl.l, profile.lightness.min, profile.lightness.max)

  return hslToHex({ h: hsl.h, s: saturation, l: lightness })
}

// Offsets de hue por armonía, medidos desde el base
export function hueOffsets(mode: HarmonyMode, seed?: number): number[] {
  switch (mode) {
    case 'analogous':
      return [-30, -15, 0, 15, 30]
    case 'complementary':
      return [-15, 15, 0, 165, 195]
    case 'triadic':
      return [-15, 15, 0, 120, 240]
    case 'monochrome':
      return [0, 0, 0, 0, 0]
    case 'random':
      return randomHueOffsets(resolveSeed(seed))
    default:
      throw new Error(`Modo de armonía inválido: ${mode}`)
  }
}

// Escalones de luminosidad alrededor del base
export function lightnessSteps(baseLightness: number, tone: PaletteTone = DEFAULT_TONE): number[] {
  const base = clamp(baseLightness, 0, 100)

  if (tone === 'balanced') {
    // Base oscuro: aclara hacia la derecha
    if (base < 30) {
      return [
        clamp(base + 6, 8, 96),
        clamp(base + 16, 8, 96),
        base,
        clamp(base + 30, 8, 96),
        clamp(base + 44, 8, 96),
      ]
    }

    // Base claro: oscurece hacia la izquierda
    if (base > 70) {
      return [
        clamp(base - 44, 8, 96),
        clamp(base - 30, 8, 96),
        base,
        clamp(base - 16, 8, 96),
        clamp(base - 6, 8, 96),
      ]
    }

    // Base medio: simétrico
    return [
      clamp(base - 26, 8, 96),
      clamp(base - 13, 8, 96),
      base,
      clamp(base + 13, 8, 96),
      clamp(base + 26, 8, 96),
    ]
  }

  const profile = TONE_PROFILES[tone]
  const steps = toneLightness(profile.lightness)
  const values = [steps[0], steps[1], base, steps[2], steps[3]]

  return ensureDistinctLightness(values, base, profile.lightness)
}

// Genera los cinco swatches a partir de la base, el modo y el tono
export function generatePalette({
  base,
  mode,
  tone = DEFAULT_TONE,
  seed,
}: GenerateOptions): Swatch[] {
  const normalizedBase = normalizeHex(base)

  if (!normalizedBase) {
    throw new Error(`Color base inválido: ${base}`)
  }

  if (!isHarmonyMode(mode)) {
    throw new Error(`Modo de armonía inválido: ${mode}`)
  }

  if (!isPaletteTone(tone)) {
    throw new Error(`Tono inválido: ${tone}`)
  }

  const baseHsl = hexToHsl(normalizedBase)
  const resolvedSeed = resolveSeed(seed)
  const rng = mulberry32(resolvedSeed)

  // 1. Calcula offsets de hue, con una variación chica para regenerar
  const offsets = hueOffsets(mode, resolvedSeed).map((offset, index) => {
    if (mode === 'random' || index === BASE_INDEX) {
      return offset
    }

    return offset + Math.round(rng() * 8 - 4)
  })

  // 2. Calcula luminosidades dentro del rango del tono
  let lightness: number[]

  if (tone === 'balanced') {
    lightness = lightnessSteps(baseHsl.l, tone).map((value, index) => {
      if (index === BASE_INDEX) {
        return value
      }

      return clamp(value + Math.round(rng() * 8 - 4), 8, 96)
    })
  } else {
    const profile = TONE_PROFILES[tone]
    const shift = Math.round(rng() * 4 - 2)
    const shifted = lightnessSteps(baseHsl.l, tone).map((value, index) => {
      if (index === BASE_INDEX) {
        return value
      }

      return clamp(value + shift, profile.lightness.min, profile.lightness.max)
    })

    lightness = ensureDistinctLightness(shifted, baseHsl.l, profile.lightness)
  }

  // 3. Arma los swatches y asegura HEX únicos
  const palette = Array.from({ length: SWATCH_COUNT }, (_, index) => {
    if (index === BASE_INDEX) {
      return {
        id: createId(),
        hex: normalizedBase,
        locked: true,
      }
    }

    return {
      id: createId(),
      hex: hslToHex({
        h: wrapHue(baseHsl.h + offsets[index]),
        s: saturationFor(mode, baseHsl.s, index, tone),
        l: lightness[index],
      }),
      locked: false,
    }
  })

  return ensureUniqueHexes(palette, tone)
}

// Regenera solo los swatches libres y conserva locks, base e IDs
export function regenerateUnlocked(swatches: Swatch[], options: GenerateOptions): Swatch[] {
  if (swatches.length !== SWATCH_COUNT) {
    throw new Error(`La paleta debe tener ${SWATCH_COUNT} swatches`)
  }

  const next = generatePalette(options)
  const merged = swatches.map((swatch, index) => {
    if (swatch.locked || index === BASE_INDEX) {
      return swatch
    }

    return {
      ...swatch,
      hex: next[index].hex,
    }
  })

  return ensureUniqueHexes(merged, options.tone ?? DEFAULT_TONE)
}

// Reconstruye la paleta con nuevas opciones; conserva locks e IDs
export function rebuildPalette(
  swatches: Swatch[],
  options: GenerateOptions,
  preserveLocks = true,
): Swatch[] {
  if (swatches.length !== SWATCH_COUNT) {
    throw new Error(`La paleta debe tener ${SWATCH_COUNT} swatches`)
  }

  const next = generatePalette(options)

  if (!preserveLocks) {
    return next
  }

  // 1. Conserva el ID y el lock del base
  // 2. Respeta los swatches bloqueados por el usuario
  // 3. Al resto le mantiene el ID pero toma el color nuevo
  const merged = next.map((swatch, index) => {
    const current = swatches[index]

    if (!current) {
      return swatch
    }

    if (index === BASE_INDEX) {
      return {
        ...swatch,
        id: current.id,
        locked: true,
      }
    }

    if (current.locked) {
      return {
        ...current,
        locked: true,
      }
    }

    return {
      ...swatch,
      id: current.id,
    }
  })

  return ensureUniqueHexes(merged, options.tone ?? DEFAULT_TONE)
}

// Alterna el lock; el base no se puede bloquear ni desbloquear
export function toggleLock(swatches: Swatch[], id: string): Swatch[] {
  const index = swatches.findIndex((swatch) => swatch.id === id)

  if (index === -1 || index === BASE_INDEX) {
    return swatches
  }

  return swatches.map((swatch, currentIndex) => {
    if (currentIndex !== index) {
      return swatch
    }

    return {
      ...swatch,
      locked: !swatch.locked,
    }
  })
}

// Hay algo para regenerar si queda algún swatch libre además del base
export function canRegenerate(swatches: Swatch[]): boolean {
  return swatches.some((swatch, index) => index !== BASE_INDEX && !swatch.locked)
}

// Cantidad de swatches bloqueados
export function lockedCount(swatches: Swatch[]): number {
  return swatches.filter((swatch) => swatch.locked).length
}

// Reconstruye swatches desde HEX ya guardados o compartidos
export function createSwatchesFromHexes(hexes: Hex[]): Swatch[] {
  if (hexes.length !== SWATCH_COUNT) {
    throw new Error(`La paleta debe tener ${SWATCH_COUNT} colores`)
  }

  const normalized = hexes.map((hex) => normalizeHex(hex))

  if (normalized.some((hex) => hex === null)) {
    throw new Error('La paleta contiene un HEX inválido')
  }

  return normalized.map((hex, index) => ({
    id: createId(),
    hex: hex as Hex,
    locked: index === BASE_INDEX,
  }))
}

// Estado completo y listo para persistir
export function createPaletteState(
  base: Hex,
  mode: HarmonyMode,
  seed?: number,
  tone: PaletteTone = DEFAULT_TONE,
): PaletteState {
  const normalizedBase = normalizeHex(base)

  if (!normalizedBase) {
    throw new Error(`Color base inválido: ${base}`)
  }

  // El base se adapta al tono, pero se conserva el original para compartir
  const appliedBase = adaptBaseToTone(normalizedBase, tone)

  return {
    version: 3,
    base: appliedBase,
    sourceBase: normalizedBase,
    mode,
    tone,
    swatches: generatePalette({ base: appliedBase, mode, tone, seed }),
  }
}
