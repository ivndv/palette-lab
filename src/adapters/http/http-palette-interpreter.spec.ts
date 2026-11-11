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

  it('no inventa un código si el backend solo manda detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ detail: 'La descripción es demasiado larga.' }, 400)),
    )

    const interpreter = new HttpPaletteInterpreter()

    await expect(interpreter.interpret('x')).rejects.toMatchObject({
      message: 'La descripción es demasiado larga.',
      code: '',
    })
  })

  it('normaliza los códigos snake_case de la API', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { code: 'prompt_too_long', message: 'La descripción es demasiado larga.' },
            400,
          ),
        ),
    )

    const interpreter = new HttpPaletteInterpreter()

    await expect(interpreter.interpret('x')).rejects.toMatchObject({
      message: 'La descripción es demasiado larga.',
      code: 'promptTooLong',
    })
  })

  it('acepta message de la API sin detail', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ code: 'ai_timeout', message: 'La IA tardó demasiado en responder.' }, 504),
        ),
    )

    const interpreter = new HttpPaletteInterpreter()

    await expect(interpreter.interpret('x')).rejects.toMatchObject({
      message: 'La IA tardó demasiado en responder.',
      code: 'timeout',
    })
  })

  it('conserva los códigos camelCase del BFF', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: 'No se pudo conectar con la IA.', code: 'unavailable' }, 503),
        ),
    )

    const interpreter = new HttpPaletteInterpreter()

    await expect(interpreter.interpret('x')).rejects.toMatchObject({
      message: 'No se pudo conectar con la IA.',
      code: 'unavailable',
    })
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
