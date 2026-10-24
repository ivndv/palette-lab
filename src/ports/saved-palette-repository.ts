// Contrato del repositorio de paletas guardadas

import type { SavedPalette } from '@/lib/saved-palette'

// Implementado por localStorage y por Supabase
export interface SavedPaletteRepository {
  list(): Promise<SavedPalette[]>
  save(palette: SavedPalette): Promise<void>
  delete(id: string): Promise<void>
}
