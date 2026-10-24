// Serialización de la paleta en la URL

import { type Hex, normalizeHex } from './color'
import {
  adaptBaseToTone,
  BASE_INDEX,
  generatePalette,
  type HarmonyMode,
  isHarmonyMode,
  isPaletteTone,
  type PaletteState,
  type PaletteTone,
  SWATCH_COUNT,
  seedFromString,
} from './palette'

// Paleta reconstruida desde la query
export interface SharedPalette {
  sourceBase: Hex
  base: Hex
  mode: HarmonyMode
  tone: PaletteTone
  swatches: Hex[]
}

// Lee una clave desde URLSearchParams o desde el query de Vue Router
function readQuery(query: Record<string, unknown> | URLSearchParams, key: string): string | null {
  if (query instanceof URLSearchParams) {
    return query.get(key)
  }

  const value = query[key]
  return typeof value === 'string' ? value : null
}

// Arma la URL con base, modo, tono y los cinco colores
export function toShareUrl(state: PaletteState, origin: string): string {
  const params = new URLSearchParams({
    b: state.sourceBase,
    m: state.mode,
    t: state.tone,
    p: state.swatches.map((swatch) => swatch.hex).join(','),
  })

  return `${origin.replace(/\/+$/, '')}/generador?${params.toString()}`
}

// Reconstruye la paleta desde la URL o la regenera con semilla estable
export function parseSharedPalette(
  query: Record<string, unknown> | URLSearchParams,
): SharedPalette | null {
  const sourceBase = normalizeHex(readQuery(query, 'b') ?? '')
  const mode = readQuery(query, 'm')
  const tone = readQuery(query, 't') ?? 'balanced'

  if (!sourceBase || !isHarmonyMode(mode) || !isPaletteTone(tone)) {
    return null
  }

  // Si vienen los cinco colores y son válidos, se respetan tal cual
  const rawSwatches = readQuery(query, 'p')

  if (rawSwatches) {
    const swatches = rawSwatches.split(',').map((hex) => normalizeHex(hex))

    if (
      swatches.length === SWATCH_COUNT &&
      swatches.every((hex) => hex !== null) &&
      new Set(swatches).size === SWATCH_COUNT
    ) {
      const normalized = swatches as Hex[]

      return {
        sourceBase,
        base: normalized[BASE_INDEX],
        mode,
        tone,
        swatches: normalized,
      }
    }
  }

  // Sin colores válidos, la paleta se regenera igual en cualquier dispositivo
  const seed = seedFromString(`${sourceBase}:${mode}:${tone}`)
  const palette = generatePalette({
    base: adaptBaseToTone(sourceBase, tone),
    mode,
    tone,
    seed,
  })

  return {
    sourceBase,
    base: palette[BASE_INDEX].hex,
    mode,
    tone,
    swatches: palette.map((swatch) => swatch.hex),
  }
}
