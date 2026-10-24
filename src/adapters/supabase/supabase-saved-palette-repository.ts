// Repositorio de paletas guardadas en Supabase

import { isSavedPalette, type SavedPalette } from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'
import { supabase } from './client'

// Fila tal como la devuelve PostgREST
interface SavedPaletteRow {
  client_id: string
  name: string
  source_base: string
  base: string
  mode: string
  tone: string
  swatches: unknown
  created_at: string
  updated_at: string
}

function client() {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  return supabase
}

// El user_id lo resuelve RLS; acá solo se necesita para el insert
async function currentUserId(): Promise<string> {
  const { data, error } = await client().auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('Necesitás iniciar sesión.')
  }

  return data.user.id
}

// Traduce la fila al modelo y descarta datos inválidos
function mapRow(row: SavedPaletteRow): SavedPalette | null {
  const candidate = {
    id: row.client_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceBase: row.source_base,
    base: row.base,
    mode: row.mode,
    tone: row.tone,
    swatches: row.swatches,
  }

  return isSavedPalette(candidate) ? candidate : null
}

export const supabaseSavedPaletteRepository: SavedPaletteRepository = {
  async list(): Promise<SavedPalette[]> {
    const { data, error } = await client()
      .from('saved_palettes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    return ((data ?? []) as SavedPaletteRow[])
      .map(mapRow)
      .filter((palette): palette is SavedPalette => palette !== null)
  },

  async save(palette: SavedPalette): Promise<void> {
    const userId = await currentUserId()

    // El upsert por client_id mantiene la sync idempotente
    const { error } = await client().from('saved_palettes').upsert(
      {
        client_id: palette.id,
        user_id: userId,
        name: palette.name,
        source_base: palette.sourceBase,
        base: palette.base,
        mode: palette.mode,
        tone: palette.tone,
        swatches: palette.swatches,
      },
      { onConflict: 'client_id' },
    )

    if (error) {
      throw error
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await client().from('saved_palettes').delete().eq('client_id', id)

    if (error) {
      throw error
    }
  },
}
