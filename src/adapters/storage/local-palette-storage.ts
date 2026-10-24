// Adaptador de persistencia local de la paleta actual

import type { PaletteState } from '@/lib/palette'
import { loadPaletteState, savePaletteState } from '@/lib/storage'
import type { PaletteStorage } from '@/ports/palette-storage'

export const localPaletteStorage: PaletteStorage = {
  load(): PaletteState | null {
    return loadPaletteState()
  },

  save(state: PaletteState): boolean {
    return savePaletteState(state)
  },
}
