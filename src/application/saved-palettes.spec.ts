// Pruebas de los casos de uso de paletas guardadas

import { describe, expect, it } from 'vitest'
import type { SavedPalette, SavedPaletteInput } from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'
import { createPalette, duplicatePalette, removePalette, renamePalette } from './saved-palettes'

const input: SavedPaletteInput = {
  name: 'Atardecer',
  sourceBase: '#4f46e5',
  base: '#4f46e5',
  mode: 'analogous',
  tone: 'balanced',
  swatches: ['#111111', '#222222', '#4f46e5', '#444444', '#555555'],
}

// Repositorio en memoria para los casos de uso
function repository(initial: SavedPalette[] = []): {
  repository: SavedPaletteRepository
  items: Map<string, SavedPalette>
} {
  const items = new Map(initial.map((item) => [item.id, item]))

  return {
    items,
    repository: {
      async list() {
        return [...items.values()]
      },
      async save(palette) {
        items.set(palette.id, palette)
      },
      async delete(id) {
        items.delete(id)
      },
    },
  }
}

describe('saved-palettes use cases', () => {
  it('crea y devuelve la lista actualizada', async () => {
    const { repository: repo } = repository()

    const result = await createPalette(repo, input)

    expect(result.palette.name).toBe('Atardecer')
    expect(result.palettes).toHaveLength(1)
  })

  it('renombra una paleta existente', async () => {
    const { repository: repo, items } = repository()
    const { palette } = await createPalette(repo, input)

    const palettes = await renamePalette(repo, palette, 'Nuevo nombre')

    expect(palettes[0].name).toBe('Nuevo nombre')
    expect(items.get(palette.id)?.name).toBe('Nuevo nombre')
  })

  it('duplica una paleta con id nuevo', async () => {
    const { repository: repo } = repository()
    const { palette } = await createPalette(repo, input)

    const palettes = await duplicatePalette(repo, palette)

    expect(palettes).toHaveLength(2)
    expect(new Set(palettes.map((item) => item.id)).size).toBe(2)
  })

  it('elimina una paleta', async () => {
    const { repository: repo } = repository()
    const { palette } = await createPalette(repo, input)

    const palettes = await removePalette(repo, palette.id)

    expect(palettes).toHaveLength(0)
  })
})
