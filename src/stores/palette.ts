// Repositorio local como respaldo del store de paletas

import { defineStore } from 'pinia'
import { usePalette } from '@/composables/usePalette'
import { getContainer } from '@/composition/container'

// El estado completo vive en el composable; acá solo se inyecta la persistencia
export const usePaletteStore = defineStore('palette', () => {
  const palette = usePalette({
    persist: true,
    storage: getContainer().paletteStorage,
  })

  return {
    ...palette,
  }
})
