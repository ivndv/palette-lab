// Adaptador HTTP del intérprete: habla con el BFF de Pages

import { type InterpretedPalette, parseInterpretedPalette } from '@/lib/ai'
import type { PaletteInterpreter } from '@/ports/palette-interpreter'

// El BFF devuelve error o detail según el caso
function readError(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const record = value as Record<string, unknown>
  const error = typeof record.error === 'string' ? record.error : null
  const detail = typeof record.detail === 'string' ? record.detail : null

  return error ?? detail
}

export class HttpPaletteInterpreter implements PaletteInterpreter {
  async interpret(prompt: string): Promise<InterpretedPalette> {
    let response: Response

    // 1. Llama al BFF; los secretos quedan del lado del servidor
    try {
      response = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
    } catch {
      throw new Error('No pudimos conectar con el servicio de IA.')
    }

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        readError(payload) ?? 'No pudimos interpretar la descripción. Prueba con otras palabras.',
      )
    }

    // 2. Valida la receta antes de que llegue al generador
    const parsed = parseInterpretedPalette(payload)

    if (!parsed) {
      throw new Error('La IA devolvió una receta inválida.')
    }

    return parsed
  }
}

export const httpPaletteInterpreter: PaletteInterpreter = new HttpPaletteInterpreter()
