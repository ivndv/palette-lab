// Contrato de persistencia de la paleta actual

import type { PaletteState } from '@/lib/palette'

// Implementado por localStorage y por los dobles de test
export interface PaletteStorage {
  load(): PaletteState | null
  save(state: PaletteState): boolean
}
