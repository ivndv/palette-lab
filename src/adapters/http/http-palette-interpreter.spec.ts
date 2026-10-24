// Pruebas del adaptador HTTP del intérprete

import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpPaletteInterpreter } from './http-palette-interpreter'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HttpPaletteInterpreter', () => {
  it('devuelve una receta válida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          base: '#B45309',
          mode: 'analogous',
          tone: 'muted',
          label: 'café cálido',
        }),
      ),
    )

    const interpreter = new HttpPaletteInterpreter()
    const result = await interpreter.interpret('café artesanal')

    expect(result).toEqual({
      base: '#b45309',
      mode: 'analogous',
      tone: 'muted',
      label: 'café cálido',
    })
  })

  it('propaga el detail del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ detail: 'La descripción es demasiado larga.' }, 400)),
    )

    const interpreter = new HttpPaletteInterpreter()

    await expect(interpreter.interpret('x')).rejects.toThrow('La descripción es demasiado larga.')
  })

  it('rechaza una receta inválida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ base: 'nope', mode: 'analogous', tone: 'muted' })),
    )

    const interpreter = new HttpPaletteInterpreter()

    await expect(interpreter.interpret('café')).rejects.toThrow(
      'La IA devolvió una receta inválida.',
    )
  })
})
