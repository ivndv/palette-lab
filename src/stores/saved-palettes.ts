// Store de paletas guardadas con sync local a nube

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { localSavedPaletteRepository } from '@/adapters/storage/local-saved-palette-repository'
import { supabaseSavedPaletteRepository } from '@/adapters/supabase/supabase-saved-palette-repository'
import {
  createSavedPalette,
  duplicateSavedPalette,
  renameSavedPalette,
  type SavedPalette,
  type SavedPaletteInput,
} from '@/lib/saved-palette'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'
import { useAuthStore } from '@/stores/auth'

// Los tests reemplazan el repositorio de Supabase por uno en memoria
let repositoryOverride: SavedPaletteRepository | null = null

export function setSavedPalettesRepository(repository: SavedPaletteRepository | null): void {
  repositoryOverride = repository
}

export const useSavedPalettesStore = defineStore('saved-palettes', () => {
  const auth = useAuthStore()
  const palettes = ref<SavedPalette[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const count = computed(() => palettes.value.length)
  const repository = computed<SavedPaletteRepository>(
    () => repositoryOverride ?? supabaseSavedPaletteRepository,
  )

  // Sin sesión no se muestran paletas ni se conserva estado
  function clearForGuest(): void {
    palettes.value = []
    loading.value = false
    error.value = null
  }

  async function load(): Promise<void> {
    if (!auth.isAuthenticated) {
      clearForGuest()
      return
    }

    loading.value = true
    error.value = null

    try {
      palettes.value = await repository.value.list()
    } catch {
      error.value = 'No pudimos cargar tus paletas guardadas.'
    } finally {
      loading.value = false
    }
  }

  // Sube lo local que sea más nuevo y resuelve por client_id + updatedAt
  async function syncLocalToCloud(): Promise<void> {
    if (!auth.isAuthenticated) {
      clearForGuest()
      return
    }

    loading.value = true
    error.value = null

    try {
      const locales = await localSavedPaletteRepository.list()
      const cloud = await repository.value.list()
      const cloudById = new Map(cloud.map((palette) => [palette.id, palette]))

      for (const local of locales) {
        const existing = cloudById.get(local.id)

        if (!existing || local.updatedAt > existing.updatedAt) {
          await repository.value.save(local)
        }
      }

      palettes.value = await repository.value.list()
    } catch {
      error.value = 'No pudimos sincronizar tus paletas con la nube.'
    } finally {
      loading.value = false
    }
  }

  async function loadForCurrentUser(): Promise<void> {
    if (auth.isAuthenticated) {
      await syncLocalToCloud()
    } else {
      clearForGuest()
    }
  }

  // Guardar es la única acción que exige sesión
  function requireSession(): boolean {
    if (auth.isAuthenticated) {
      return true
    }

    error.value = 'Necesitás iniciar sesión para guardar paletas.'
    return false
  }

  async function create(input: SavedPaletteInput): Promise<SavedPalette> {
    if (!requireSession()) {
      throw new Error('Necesitás iniciar sesión para guardar paletas.')
    }

    error.value = null

    try {
      const palette = createSavedPalette(input)
      await repository.value.save(palette)
      palettes.value = await repository.value.list()
      return palette
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No pudimos guardar la paleta.'
      throw cause
    }
  }

  async function rename(id: string, name: string): Promise<void> {
    if (!requireSession()) {
      return
    }

    error.value = null

    const palette = palettes.value.find((item) => item.id === id)

    if (!palette) {
      error.value = 'La paleta no existe.'
      return
    }

    try {
      const updated = renameSavedPalette(palette, name)
      await repository.value.save(updated)
      palettes.value = await repository.value.list()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'No pudimos renombrar la paleta.'
    }
  }

  async function duplicate(id: string): Promise<void> {
    if (!requireSession()) {
      return
    }

    error.value = null

    const palette = palettes.value.find((item) => item.id === id)

    if (!palette) {
      error.value = 'La paleta no existe.'
      return
    }

    try {
      await repository.value.save(duplicateSavedPalette(palette))
      palettes.value = await repository.value.list()
    } catch {
      error.value = 'No pudimos duplicar la paleta.'
    }
  }

  async function remove(id: string): Promise<void> {
    if (!requireSession()) {
      return
    }

    error.value = null

    try {
      await repository.value.delete(id)
      palettes.value = await repository.value.list()
    } catch {
      error.value = 'No pudimos eliminar la paleta.'
    }
  }

  function getById(id: string): SavedPalette | undefined {
    return palettes.value.find((palette) => palette.id === id)
  }

  // Al entrar sube lo local; al salir limpia la vista
  watch(
    () => auth.isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        void syncLocalToCloud()
      } else {
        clearForGuest()
      }
    },
  )

  return {
    palettes,
    loading,
    error,
    count,
    load,
    loadForCurrentUser,
    syncLocalToCloud,
    create,
    rename,
    duplicate,
    remove,
    getById,
  }
})
