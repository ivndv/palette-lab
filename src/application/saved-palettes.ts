// Casos de uso de paletas guardadas

import {
  createSavedPalette as createPaletteDomain,
  duplicateSavedPalette as duplicatePaletteDomain,
  renameSavedPalette as renamePaletteDomain,
  type SavedPalette,
  type SavedPaletteInput,
} from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'

// Crea, guarda y devuelve la lista actualizada
export async function createPalette(
  repository: SavedPaletteRepository,
  input: SavedPaletteInput,
): Promise<{ palette: SavedPalette; palettes: SavedPalette[] }> {
  const palette = createPaletteDomain(input)
  await repository.save(palette)

  return { palette, palettes: await repository.list() }
}

export async function renamePalette(
  repository: SavedPaletteRepository,
  palette: SavedPalette,
  name: string,
): Promise<SavedPalette[]> {
  await repository.save(renamePaletteDomain(palette, name))

  return repository.list()
}

export async function duplicatePalette(
  repository: SavedPaletteRepository,
  palette: SavedPalette,
): Promise<SavedPalette[]> {
  await repository.save(duplicatePaletteDomain(palette))

  return repository.list()
}

export async function removePalette(
  repository: SavedPaletteRepository,
  id: string,
): Promise<SavedPalette[]> {
  await repository.delete(id)

  return repository.list()
}
