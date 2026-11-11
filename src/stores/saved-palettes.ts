// Store de paletas guardadas con sync local a nube

import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  createPalette,
  duplicatePalette,
  removePalette,
  renamePalette,
} from '@/application/saved-palettes'
import { syncSavedPalettes } from '@/application/sync-saved-palettes'
import { getContainer } from '@/composition/container'
import { i18n } from '@/i18n'
import { SWATCH_COUNT } from '@/lib/palette'
import { type SavedPalette, type SavedPaletteInput, savedErrorCode } from '@/lib/saved-palette'
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
    () => repositoryOverride ?? getContainer().remoteSavedPalettes,
  )

  // Traduce los errores de validación del dominio
  function savedMessage(cause: unknown, fallbackKey: string): string {
    const code = savedErrorCode(cause)

    return code
      ? i18n.global.t(`saved.errors.${code}`, { count: SWATCH_COUNT })
      : i18n.global.t(fallbackKey)
  }

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
      error.value = i18n.global.t('saved.loadError')
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
      palettes.value = await syncSavedPalettes({
        local: getContainer().localSavedPalettes,
        remote: repository.value,
      })
    } catch {
      error.value = i18n.global.t('saved.syncError')
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

    error.value = i18n.global.t('saved.sessionRequired')
    return false
  }

  async function create(input: SavedPaletteInput): Promise<SavedPalette> {
    if (!requireSession()) {
      throw new Error(i18n.global.t('saved.sessionRequired'))
    }

    error.value = null

    try {
      const result = await createPalette(repository.value, input)
      palettes.value = result.palettes
      return result.palette
    } catch (cause) {
      error.value = savedMessage(cause, 'saved.saveError')
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
      error.value = i18n.global.t('saved.notFound')
      return
    }

    try {
      palettes.value = await renamePalette(repository.value, palette, name)
    } catch (cause) {
      error.value = savedMessage(cause, 'saved.renameError')
    }
  }

  async function duplicate(id: string): Promise<void> {
    if (!requireSession()) {
      return
    }

    error.value = null

    const palette = palettes.value.find((item) => item.id === id)

    if (!palette) {
      error.value = i18n.global.t('saved.notFound')
      return
    }

    try {
      palettes.value = await duplicatePalette(repository.value, palette)
    } catch {
      error.value = i18n.global.t('saved.duplicateError')
    }
  }

  async function remove(id: string): Promise<void> {
    if (!requireSession()) {
      return
    }

    error.value = null

    try {
      palettes.value = await removePalette(repository.value, id)
    } catch {
      error.value = i18n.global.t('saved.deleteError')
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
