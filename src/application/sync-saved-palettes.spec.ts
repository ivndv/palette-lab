// Pruebas del caso de uso de sincronización

import { describe, expect, it } from 'vitest'
import type { SavedPalette } from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'
import { syncSavedPalettes } from './sync-saved-palettes'

function palette(id: string, updatedAt: string): SavedPalette {
  return {
    id,
    name: id,
    createdAt: updatedAt,
    updatedAt,
    sourceBase: '#4f46e5',
    base: '#4f46e5',
    mode: 'analogous',
    tone: 'balanced',
    swatches: ['#111111', '#222222', '#4f46e5', '#444444', '#555555'],
  }
}

// Repositorio en memoria para el caso de uso
function repository(initial: SavedPalette[]): SavedPaletteRepository {
  const items = new Map(initial.map((item) => [item.id, item]))

  return {
    async list() {
      return [...items.values()]
    },
    async save(item) {
      items.set(item.id, item)
    },
    async delete(id) {
      items.delete(id)
    },
  }
}

describe('syncSavedPalettes', () => {
  it('sube lo local más nuevo y conserva lo remoto', async () => {
    const local = repository([
      palette('a', '2026-01-01T00:00:00.000Z'),
      palette('b', '2026-01-02T00:00:00.000Z'),
      palette('c', '2026-01-03T00:00:00.000Z'),
    ])
    const remote = repository([
      palette('a', '2026-02-01T00:00:00.000Z'),
      palette('c', '2026-01-01T00:00:00.000Z'),
      palette('d', '2026-01-04T00:00:00.000Z'),
    ])

    const result = await syncSavedPalettes({ local, remote })
    const byId = new Map(result.map((item) => [item.id, item]))

    expect(byId.size).toBe(4)
    expect(byId.get('a')?.updatedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(byId.get('b')?.updatedAt).toBe('2026-01-02T00:00:00.000Z')
    expect(byId.get('c')?.updatedAt).toBe('2026-01-03T00:00:00.000Z')
    expect(byId.get('d')).toBeDefined()
  })

  it('propaga los errores del repositorio remoto', async () => {
    const local = repository([])
    const remote: SavedPaletteRepository = {
      list: async () => {
        throw new Error('offline')
      },
      save: async () => undefined,
      delete: async () => undefined,
    }

    await expect(syncSavedPalettes({ local, remote })).rejects.toThrow('offline')
  })
})
