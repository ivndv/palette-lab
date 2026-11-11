// Pruebas del caso de uso de interpretación

import { describe, expect, it, vi } from 'vitest'
import type { InterpretedPalette } from '@/lib/ai'
import { seedFromString } from '@/lib/palette'
import type { PaletteInterpreter } from '@/ports/palette-interpreter'
import { interpretPrompt } from './interpret-prompt'

const interpretation: InterpretedPalette = {
  base: '#4f46e5',
  mode: 'analogous',
  tone: 'balanced',
}

describe('interpretPrompt', () => {
  it('agrega la semilla derivada del prompt', async () => {
    const interpreter: PaletteInterpreter = {
      interpret: vi.fn(async () => interpretation),
    }

    const result = await interpretPrompt(interpreter, 'atardecer en la playa')

    expect(interpreter.interpret).toHaveBeenCalledWith('atardecer en la playa')
    expect(result.seed).toBe(seedFromString('atardecer en la playa'))
    expect(result.base).toBe(interpretation.base)
  })
})
