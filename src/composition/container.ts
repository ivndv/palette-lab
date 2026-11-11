// Composition root: une los puertos con sus adaptadores concretos

import { httpPaletteInterpreter } from '@/adapters/http/http-palette-interpreter'
import { localPaletteStorage } from '@/adapters/storage/local-palette-storage'
import { localSavedPaletteRepository } from '@/adapters/storage/local-saved-palette-repository'
import { supabaseAuthGateway } from '@/adapters/supabase/supabase-auth-gateway'
import { supabaseSavedPaletteRepository } from '@/adapters/supabase/supabase-saved-palette-repository'
import type { AuthGateway } from '@/ports/auth-gateway'
import type { PaletteInterpreter } from '@/ports/palette-interpreter'
import type { PaletteStorage } from '@/ports/palette-storage'
import type { SavedPaletteRepository } from '@/ports/saved-palette-repository'

// Dependencias que consume la app; los tests pueden reemplazarlas
export interface AppContainer {
  auth: AuthGateway
  interpreter: PaletteInterpreter
  paletteStorage: PaletteStorage
  localSavedPalettes: SavedPaletteRepository
  remoteSavedPalettes: SavedPaletteRepository
}

const container: AppContainer = {
  auth: supabaseAuthGateway,
  interpreter: httpPaletteInterpreter,
  paletteStorage: localPaletteStorage,
  localSavedPalettes: localSavedPaletteRepository,
  remoteSavedPalettes: supabaseSavedPaletteRepository,
}

export function getContainer(): AppContainer {
  return container
}
