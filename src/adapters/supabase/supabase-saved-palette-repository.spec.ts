// Pruebas del repositorio de paletas guardadas en Supabase

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SavedPalette } from '@/lib/saved-palette'
import { supabaseSavedPaletteRepository } from './supabase-saved-palette-repository'

const mocks = vi.hoisted(() => {
  const builder = {
    select: vi.fn(),
    order: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
  }

  return {
    builder,
    supabase: {
      auth: { getUser: vi.fn() },
      from: vi.fn(() => builder),
    },
  }
})

vi.mock('./client', () => ({ supabase: mocks.supabase }))

const row = {
  client_id: 'p1',
  name: 'Atardecer',
  source_base: '#4f46e5',
  base: '#4f46e5',
  mode: 'analogous',
  tone: 'balanced',
  swatches: ['#111111', '#222222', '#4f46e5', '#444444', '#555555'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

const palette: SavedPalette = {
  id: 'p1',
  name: 'Atardecer',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  sourceBase: '#4f46e5',
  base: '#4f46e5',
  mode: 'analogous',
  tone: 'balanced',
  swatches: row.swatches as SavedPalette['swatches'],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.supabase.from.mockReturnValue(mocks.builder)
  mocks.builder.select.mockReturnValue(mocks.builder)
  mocks.builder.delete.mockReturnValue(mocks.builder)
})

describe('supabaseSavedPaletteRepository', () => {
  it('lista y mapea solo filas válidas', async () => {
    mocks.builder.order.mockResolvedValue({
      data: [row, { ...row, client_id: 'p2', base: '#000000' }],
      error: null,
    })

    const palettes = await supabaseSavedPaletteRepository.list()

    expect(palettes).toHaveLength(1)
    expect(palettes[0]).toMatchObject({ id: 'p1', name: 'Atardecer' })
  })

  it('propaga el error al listar', async () => {
    mocks.builder.order.mockResolvedValue({ data: null, error: new Error('boom') })

    await expect(supabaseSavedPaletteRepository.list()).rejects.toThrow('boom')
  })

  it('guarda con el user_id de la sesión', async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mocks.builder.upsert.mockResolvedValue({ error: null })

    await supabaseSavedPaletteRepository.save(palette)

    expect(mocks.builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'p1', user_id: 'u1' }),
      { onConflict: 'client_id' },
    )
  })

  it('exige sesión para guardar', async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(supabaseSavedPaletteRepository.save(palette)).rejects.toThrow(
      'Necesitás iniciar sesión.',
    )
  })

  it('propaga errores de sesión y de upsert', async () => {
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('sin sesión'),
    })

    await expect(supabaseSavedPaletteRepository.save(palette)).rejects.toThrow('sin sesión')

    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mocks.builder.upsert.mockResolvedValue({ error: new Error('upsert') })

    await expect(supabaseSavedPaletteRepository.save(palette)).rejects.toThrow('upsert')
  })

  it('elimina por client_id', async () => {
    mocks.builder.eq.mockResolvedValue({ error: null })

    await supabaseSavedPaletteRepository.delete('p1')

    expect(mocks.builder.delete).toHaveBeenCalled()
    expect(mocks.builder.eq).toHaveBeenCalledWith('client_id', 'p1')
  })

  it('propaga el error al eliminar', async () => {
    mocks.builder.eq.mockResolvedValue({ error: new Error('delete') })

    await expect(supabaseSavedPaletteRepository.delete('p1')).rejects.toThrow('delete')
  })
})
