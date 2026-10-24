// Repositorio local de paletas guardadas

import {
  isSavedPalette,
  MAX_SAVED_PALETTES,
  SAVED_PALETTES_STORAGE_KEY,
  SAVED_PALETTES_VERSION,
  type SavedPalette,
} from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'

// Formato que se guarda en localStorage
interface SavedPalettesFile {
  version: 1
  palettes: SavedPalette[]
}

// Lee y filtra lo que sea válido; nunca rompe por datos corruptos
function read(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(SAVED_PALETTES_STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) {
      return []
    }

    const value = parsed as Record<string, unknown>

    if (value.version !== SAVED_PALETTES_VERSION || !Array.isArray(value.palettes)) {
      return []
    }

    return value.palettes.filter(isSavedPalette)
  } catch {
    return []
  }
}

function write(palettes: SavedPalette[]): void {
  const data: SavedPalettesFile = {
    version: 1,
    palettes,
  }

  localStorage.setItem(SAVED_PALETTES_STORAGE_KEY, JSON.stringify(data))
}

export const localSavedPaletteRepository: SavedPaletteRepository = {
  async list(): Promise<SavedPalette[]> {
    return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async save(palette: SavedPalette): Promise<void> {
    const palettes = read()
    const index = palettes.findIndex((item) => item.id === palette.id)

    // 1. Actualiza por id o agrega al principio
    if (index >= 0) {
      palettes[index] = palette
    } else {
      palettes.unshift(palette)
    }

    palettes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    // 2. Respeta el límite del plan local
    if (palettes.length > MAX_SAVED_PALETTES) {
      palettes.length = MAX_SAVED_PALETTES
    }

    write(palettes)
  },

  async delete(id: string): Promise<void> {
    write(read().filter((palette) => palette.id !== id))
  },
}
