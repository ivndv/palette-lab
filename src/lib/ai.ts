// Validación de la receta que devuelve la IA

import { type Hex, normalizeHex } from './color'
import { type HarmonyMode, isHarmonyMode, isPaletteTone, type PaletteTone } from './palette'

// Receta lista para alimentar el generador
export interface InterpretedPalette {
  base: Hex
  mode: HarmonyMode
  tone: PaletteTone
  label?: string
}

// Descarta arrays y null antes de leer propiedades
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Normaliza la respuesta del modelo o devuelve null si no es confiable
export function parseInterpretedPalette(value: unknown): InterpretedPalette | null {
  if (!isRecord(value)) {
    return null
  }

  const base = typeof value.base === 'string' ? normalizeHex(value.base) : null

  if (!base || !isHarmonyMode(value.mode) || !isPaletteTone(value.tone)) {
    return null
  }

  // El nombre es opcional y se recorta para no romper la UI
  const label =
    typeof value.label === 'string' && value.label.trim().length > 0
      ? value.label.trim().slice(0, 60)
      : undefined

  return {
    base,
    mode: value.mode,
    tone: value.tone,
    label,
  }
}
