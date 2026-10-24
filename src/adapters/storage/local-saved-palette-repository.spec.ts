// Pruebas del repositorio local de paletas

import { beforeEach, describe, expect, it } from 'vitest'
import { createSavedPalette, type SavedPaletteInput } from '@/lib/saved-palette'
import { localSavedPaletteRepository } from './local-saved-palette-repository'

const INPUT: SavedPaletteInput = {
  name: 'Atardecer',
  sourceBase: '#f97316',
  base: '#f9a8d4',
  mode: 'analogous',
  tone: 'pastel',
  swatches: ['#fde68a', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd'],
}

beforeEach(() => {
  localStorage.clear()
})

describe('localSavedPaletteRepository', () => {
  it('guarda, lista y elimina paletas', async () => {
    const palette = createSavedPalette(INPUT)

    await localSavedPaletteRepository.save(palette)

    expect(await localSavedPaletteRepository.list()).toEqual([palette])

    await localSavedPaletteRepository.delete(palette.id)

    expect(await localSavedPaletteRepository.list()).toEqual([])
  })

  it('actualiza una paleta existente por id', async () => {
    const palette = createSavedPalette(INPUT)
    await localSavedPaletteRepository.save(palette)

    const updated = { ...palette, name: 'Otoño' }
    await localSavedPaletteRepository.save(updated)

    const list = await localSavedPaletteRepository.list()

    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Otoño')
  })

  it('tolera JSON corrupto', async () => {
    localStorage.setItem('palette-lab:saved:v1', '{')

    expect(await localSavedPaletteRepository.list()).toEqual([])
  })
})
