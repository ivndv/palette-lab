// Pruebas del store de paletas guardadas y la sync

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { localSavedPaletteRepository } from '@/adapters/storage/local-saved-palette-repository'
import { createSavedPalette, type SavedPalette, type SavedPaletteInput } from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'
import { FakeAuthGateway, fakeSession } from '@/test/fake-auth-gateway'
import { resetAuthGateway, setAuthGateway, useAuthStore } from './auth'
import { setSavedPalettesRepository, useSavedPalettesStore } from './saved-palettes'

const INPUT: SavedPaletteInput = {
  name: 'Atardecer',
  sourceBase: '#f97316',
  base: '#f9a8d4',
  mode: 'analogous',
  tone: 'pastel',
  swatches: ['#fde68a', '#fca5a5', '#f9a8d4', '#c4b5fd', '#93c5fd'],
}

class FakeRepository implements SavedPaletteRepository {
  palettes: SavedPalette[] = []

  async list(): Promise<SavedPalette[]> {
    return [...this.palettes]
  }

  async save(palette: SavedPalette): Promise<void> {
    const index = this.palettes.findIndex((item) => item.id === palette.id)

    if (index >= 0) {
      this.palettes[index] = palette
    } else {
      this.palettes.unshift(palette)
    }
  }

  async delete(id: string): Promise<void> {
    this.palettes = this.palettes.filter((palette) => palette.id !== id)
  }
}

let repository: FakeRepository

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const gateway = new FakeAuthGateway()
  gateway.session = fakeSession('iva@example.com')
  setAuthGateway(gateway)
  repository = new FakeRepository()
  setSavedPalettesRepository(repository)

  const auth = useAuthStore()
  await auth.initialize()
})

afterEach(() => {
  setSavedPalettesRepository(null)
  resetAuthGateway()
})

describe('useSavedPalettesStore', () => {
  it('no permite guardar sin sesión', async () => {
    const auth = useAuthStore()
    await auth.signOut()

    const store = useSavedPalettesStore()

    await expect(store.create(INPUT)).rejects.toThrow(
      'Necesitás iniciar sesión para guardar paletas.',
    )
    expect(store.palettes).toHaveLength(0)
  })

  it('crea y lista paletas con sesión', async () => {
    const store = useSavedPalettesStore()

    const palette = await store.create(INPUT)

    expect(store.count).toBe(1)
    expect(store.palettes[0]).toEqual(palette)
  })

  it('renombra, duplica y elimina', async () => {
    const store = useSavedPalettesStore()
    const palette = await store.create(INPUT)

    await store.rename(palette.id, 'Otoño')
    expect(store.palettes[0].name).toBe('Otoño')

    await store.duplicate(palette.id)
    expect(store.count).toBe(2)

    await store.remove(palette.id)
    expect(store.count).toBe(1)
  })

  it('sube las paletas locales al sincronizar', async () => {
    const local = createSavedPalette(INPUT)
    await localSavedPaletteRepository.save(local)

    const store = useSavedPalettesStore()
    await store.syncLocalToCloud()

    expect(repository.palettes).toHaveLength(1)
    expect(repository.palettes[0].id).toBe(local.id)
  })

  it('devuelve error si el nombre es inválido', async () => {
    const store = useSavedPalettesStore()

    await expect(store.create({ ...INPUT, name: '' })).rejects.toThrow()
    expect(store.error).toBe('El nombre debe tener entre 1 y 80 caracteres.')
  })
})
