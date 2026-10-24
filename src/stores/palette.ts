// Repositorio local como respaldo del store de paletas

import { defineStore } from 'pinia'
import { localPaletteStorage } from '@/adapters/storage/local-palette-storage'
import { usePalette } from '@/composables/usePalette'

// El estado completo vive en el composable; acá solo se inyecta la persistencia
export const usePaletteStore = defineStore('palette', () => {
  const palette = usePalette({
    persist: true,
    storage: localPaletteStorage,
  })

  return {
    ...palette,
  }
})
