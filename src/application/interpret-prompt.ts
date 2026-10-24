// Caso de uso: interpretar un texto y derivar la semilla

import type { InterpretedPalette } from '@/lib/ai'
import { seedFromString } from '@/lib/palette'
import type { PaletteInterpreter } from '@/ports/palette-interpreter'

// Receta más la semilla estable que genera el texto
export interface InterpretedPrompt extends InterpretedPalette {
  seed: number
}

// La semilla depende del prompt, no del modelo
export async function interpretPrompt(
  interpreter: PaletteInterpreter,
  prompt: string,
): Promise<InterpretedPrompt> {
  const interpretation = await interpreter.interpret(prompt)

  return {
    ...interpretation,
    seed: seedFromString(prompt),
  }
}
