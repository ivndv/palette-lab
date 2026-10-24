// Contrato del intérprete de lenguaje natural

import type { InterpretedPalette } from '@/lib/ai'

// La implementación puede ser HTTP, mock o cualquier otro backend
export interface PaletteInterpreter {
  interpret(prompt: string): Promise<InterpretedPalette>
}
