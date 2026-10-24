// Modelo y validación de las paletas guardadas

import { type Hex, normalizeHex } from './color'
import {
  BASE_INDEX,
  type HarmonyMode,
  isHarmonyMode,
  isPaletteTone,
  type PaletteTone,
  SWATCH_COUNT,
} from './palette'

export const SAVED_PALETTES_VERSION = 1
export const SAVED_PALETTES_STORAGE_KEY = 'palette-lab:saved:v1'
export const MAX_SAVED_PALETTES = 100

// Paleta persistida con sus metadatos
export interface SavedPalette {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  sourceBase: Hex
  base: Hex
  mode: HarmonyMode
  tone: PaletteTone
  swatches: Hex[]
}

// Datos que aporta el usuario al guardar
export type SavedPaletteInput = Omit<SavedPalette, 'id' | 'createdAt' | 'updatedAt'>

// Descarta arrays y null antes de leer propiedades
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Fecha ISO parseable
function isDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

// Valida una paleta guardada completa, venga de localStorage o Supabase
export function isSavedPalette(value: unknown): value is SavedPalette {
  if (!isRecord(value)) {
    return false
  }

  if (typeof value.id !== 'string' || value.id.length === 0) {
    return false
  }

  if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > 80) {
    return false
  }

  if (!isDateString(value.createdAt) || !isDateString(value.updatedAt)) {
    return false
  }

  if (typeof value.sourceBase !== 'string' || normalizeHex(value.sourceBase) !== value.sourceBase) {
    return false
  }

  if (typeof value.base !== 'string' || normalizeHex(value.base) !== value.base) {
    return false
  }

  if (!isHarmonyMode(value.mode) || !isPaletteTone(value.tone)) {
    return false
  }

  if (!Array.isArray(value.swatches) || value.swatches.length !== SWATCH_COUNT) {
    return false
  }

  const swatches = value.swatches.map((hex) => (typeof hex === 'string' ? normalizeHex(hex) : null))

  if (swatches.some((hex) => hex === null)) {
    return false
  }

  const normalized = swatches as Hex[]

  // Sin repetidos y con el base anclado en el centro
  if (new Set(normalized).size !== SWATCH_COUNT) {
    return false
  }

  return normalized[BASE_INDEX] === value.base
}

// Crea una paleta válida a partir de los datos del formulario
export function createSavedPalette(input: SavedPaletteInput): SavedPalette {
  const now = new Date().toISOString()
  const name = input.name.trim()
  const swatches = input.swatches.map((hex) => normalizeHex(hex))
  const sourceBase = normalizeHex(input.sourceBase)
  const base = normalizeHex(input.base)

  if (!name || name.length > 80) {
    throw new Error('El nombre debe tener entre 1 y 80 caracteres.')
  }

  if (!sourceBase || !base || swatches.some((hex) => hex === null)) {
    throw new Error('La paleta contiene un HEX inválido.')
  }

  if (!isHarmonyMode(input.mode) || !isPaletteTone(input.tone)) {
    throw new Error('La armonía o el tono son inválidos.')
  }

  if (swatches.length !== SWATCH_COUNT) {
    throw new Error(`La paleta debe tener ${SWATCH_COUNT} colores.`)
  }

  const normalizedSwatches = swatches as Hex[]

  if (new Set(normalizedSwatches).size !== SWATCH_COUNT) {
    throw new Error('La paleta contiene colores repetidos.')
  }

  if (normalizedSwatches[BASE_INDEX] !== base) {
    throw new Error('El color base no está anclado en la paleta.')
  }

  return {
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    sourceBase,
    base,
    mode: input.mode,
    tone: input.tone,
    swatches: normalizedSwatches,
  }
}

// Cambia el nombre y actualiza la fecha
export function renameSavedPalette(palette: SavedPalette, name: string): SavedPalette {
  const nextName = name.trim()

  if (!nextName || nextName.length > 80) {
    throw new Error('El nombre debe tener entre 1 y 80 caracteres.')
  }

  return {
    ...palette,
    name: nextName,
    updatedAt: new Date().toISOString(),
  }
}

// Copia profunda con nombre y fechas nuevas
export function duplicateSavedPalette(palette: SavedPalette): SavedPalette {
  const now = new Date().toISOString()

  return {
    ...palette,
    id: createId(),
    name: `${palette.name} copia`.slice(0, 80),
    createdAt: now,
    updatedAt: now,
    swatches: [...palette.swatches],
  }
}

// UUID v4 con fallback manual si el navegador no lo expone
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  // Marca versión 4 y variante RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
