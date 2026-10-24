// Persistencia y migración del estado de la paleta en localStorage

import { type Hex, normalizeHex } from './color'
import {
  BASE_INDEX,
  type HarmonyMode,
  isHarmonyMode,
  isPaletteTone,
  type PaletteState,
  type PaletteTone,
  SWATCH_COUNT,
  type Swatch,
} from './palette'

export const PALETTE_STORAGE_KEY = 'palette-lab:v1'

// Formato anterior a los tonos
export interface LegacyPaletteStateV1 {
  version: 1
  base: Hex
  mode: HarmonyMode
  swatches: Swatch[]
}

// Formato anterior a sourceBase
export interface LegacyPaletteStateV2 {
  version: 2
  base: Hex
  mode: HarmonyMode
  tone: PaletteTone
  swatches: Swatch[]
}

// Descarta arrays y null antes de leer propiedades
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Valida un swatch persistido
function isSwatch(value: unknown): value is Swatch {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.hex === 'string' &&
    normalizeHex(value.hex) === value.hex &&
    typeof value.locked === 'boolean'
  )
}

// Campos comunes a todas las versiones
function hasValidCore(value: Record<string, unknown>): boolean {
  if (typeof value.base !== 'string' || normalizeHex(value.base) !== value.base) {
    return false
  }

  if (!isHarmonyMode(value.mode)) {
    return false
  }

  if (!Array.isArray(value.swatches) || value.swatches.length !== SWATCH_COUNT) {
    return false
  }

  if (!value.swatches.every(isSwatch)) {
    return false
  }

  const swatches = value.swatches as Swatch[]
  const uniqueIds = new Set(swatches.map((swatch) => swatch.id))

  if (uniqueIds.size !== SWATCH_COUNT) {
    return false
  }

  // El base tiene que estar en el centro y bloqueado
  if (swatches[BASE_INDEX]?.hex !== value.base || !swatches[BASE_INDEX]?.locked) {
    return false
  }

  return true
}

// Guardas de versión para migrar sin perder datos
export function isLegacyPaletteState(value: unknown): value is LegacyPaletteStateV1 {
  if (!isRecord(value) || value.version !== 1) {
    return false
  }

  return hasValidCore(value)
}

export function isLegacyPaletteStateV2(value: unknown): value is LegacyPaletteStateV2 {
  if (!isRecord(value) || value.version !== 2) {
    return false
  }

  if (!isPaletteTone(value.tone)) {
    return false
  }

  return hasValidCore(value)
}

export function isPaletteState(value: unknown): value is PaletteState {
  if (!isRecord(value) || value.version !== 3) {
    return false
  }

  if (!isPaletteTone(value.tone)) {
    return false
  }

  if (typeof value.sourceBase !== 'string' || normalizeHex(value.sourceBase) !== value.sourceBase) {
    return false
  }

  return hasValidCore(value)
}

// Carga el estado actual o migra desde v1/v2
export function loadPaletteState(): PaletteState | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null
    }

    const raw = localStorage.getItem(PALETTE_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (isPaletteState(parsed)) {
      return parsed
    }

    // v2: agrega sourceBase tomando el base actual
    if (isLegacyPaletteStateV2(parsed)) {
      return {
        ...parsed,
        version: 3,
        sourceBase: parsed.base,
      }
    }

    // v1: además agrega el tono por defecto
    if (isLegacyPaletteState(parsed)) {
      return {
        ...parsed,
        version: 3,
        sourceBase: parsed.base,
        tone: 'balanced',
      }
    }

    return null
  } catch {
    return null
  }
}

// Guarda el estado y devuelve false si el navegador lo bloquea
export function savePaletteState(state: PaletteState): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false
    }

    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
