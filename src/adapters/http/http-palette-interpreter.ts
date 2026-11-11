// Adaptador HTTP del intérprete: habla con el BFF de Pages

import { type InterpretedPalette, parseInterpretedPalette } from '@/lib/ai'
import type { PaletteInterpreter } from '@/ports/palette-interpreter'

// El BFF devuelve error y code según el caso
function readError(value: unknown): { code: string; message: string } | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const record = value as Record<string, unknown>
  const error = typeof record.error === 'string' ? record.error : ''
  const message = typeof record.message === 'string' ? record.message : ''
  const detail = typeof record.detail === 'string' ? record.detail : ''
  const code = typeof record.code === 'string' ? record.code : ''

  if (!error && !message && !detail) {
    return null
  }

  return { code, message: error || message || detail }
}

// La API usa snake_case; el BFF y la UI usan camelCase
const API_CODES: Record<string, string> = {
  prompt_empty: 'emptyPrompt',
  prompt_too_long: 'promptTooLong',
  rate_limited: 'rateLimited',
  daily_limit: 'rateLimited',
  global_daily_limit: 'rateLimited',
  ai_rate_limited: 'rateLimited',
  ai_timeout: 'timeout',
  ai_unavailable: 'unavailable',
  ai_bad_request: 'upstream',
  ai_invalid_recipe: 'invalidRecipe',
  ai_error: 'upstream',
  invalid_api_key: 'request',
  validation_error: 'request',
}

const CLIENT_CODES = new Set([
  'body',
  'missingPrompt',
  'emptyPrompt',
  'promptTooLong',
  'missingUrl',
  'rateLimited',
  'upstream',
  'invalidRecipe',
  'timeout',
  'connect',
  'unavailable',
  'request',
])

// Traduce códigos de la API; deja pasar los del BFF; descarta los desconocidos
function normalizeCode(code: string): string {
  if (!code) {
    return ''
  }

  return API_CODES[code] ?? (CLIENT_CODES.has(code) ? code : '')
}

// Adjunta el código para que la UI traduzca el mensaje
function interpreterError(message: string, code: string): Error {
  const error = new Error(message)
  ;(error as Error & { code?: string }).code = code

  return error
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
      throw interpreterError('No pudimos conectar con el servicio de IA.', 'connect')
    }

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const error = readError(payload)

      // Si el backend manda un detail sin code, se conserva el mensaje;
      // la UI solo traduce cuando hay un código estable
      throw interpreterError(
        error?.message ?? 'No pudimos interpretar la descripción. Prueba con otras palabras.',
        error ? normalizeCode(error.code) : 'request',
      )
    }

    // 2. Valida la receta antes de que llegue al generador
    const parsed = parseInterpretedPalette(payload)

    if (!parsed) {
      throw interpreterError('La IA devolvió una receta inválida.', 'invalidRecipe')
    }

    return parsed
  }
}

export const httpPaletteInterpreter: PaletteInterpreter = new HttpPaletteInterpreter()
