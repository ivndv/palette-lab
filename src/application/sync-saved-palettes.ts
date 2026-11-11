// Caso de uso: subir lo local más nuevo y devolver la lista final

import type { SavedPalette } from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'

export interface SyncRepositories {
  local: SavedPaletteRepository
  remote: SavedPaletteRepository
}

// Resuelve por client_id + updatedAt: gana la versión más reciente
export async function syncSavedPalettes({
  local,
  remote,
}: SyncRepositories): Promise<SavedPalette[]> {
  const locales = await local.list()
  const cloud = await remote.list()
  const cloudById = new Map(cloud.map((palette) => [palette.id, palette]))

  for (const palette of locales) {
    const existing = cloudById.get(palette.id)

    if (!existing || palette.updatedAt > existing.updatedAt) {
      await remote.save(palette)
    }
  }

  return remote.list()
}
