// Pruebas de los formatos de exportación

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createExportFormats,
  download,
  formatSwatchText,
  toCssVariables,
  toEnrichedJson,
  toJson,
  toScssVariables,
  toTailwindTheme,
} from './export'
import { createPaletteState } from './palette'

const state = createPaletteState('#4f46e5', 'analogous', 42)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('export formats', () => {
  it('genera variables CSS con alias del base', () => {
    const css = toCssVariables(state.swatches)

    expect(css).toContain(':root {')
    expect(css).toContain('--color-1:')
    expect(css).toContain('--color-base: #4f46e5;')
  })

  it('genera variables SCSS', () => {
    const scss = toScssVariables(state.swatches)

    expect(scss).toContain('$color-1:')
    expect(scss).toContain('$color-base: #4f46e5;')
  })

  it('genera un tema de Tailwind v4', () => {
    const theme = toTailwindTheme(state.swatches)

    expect(theme).toContain('@theme {')
    expect(theme).toContain('--color-palette-1:')
    expect(theme).toContain('--color-palette-base: #4f46e5;')
  })

  it('genera JSON enriquecido con texto y contraste', () => {
    const data = JSON.parse(toEnrichedJson(state)) as {
      version: number
      base: string
      swatches: Array<{ hex: string; text: string; contrast: number; level: string }>
    }

    expect(data.version).toBe(1)
    expect(data.base).toBe('#4f46e5')
    expect(data.swatches).toHaveLength(5)
    expect(data.swatches[0].text).toMatch(/^#[0-9a-f]{6}$/)
    expect(data.swatches[0].contrast).toBeGreaterThanOrEqual(4.5)
    expect(['AAA', 'AA', 'AA Large', 'Fail']).toContain(data.swatches[0].level)
  })

  it('arma los cinco formatos de exportación', () => {
    const formats = createExportFormats(state, 'https://palette-lab.test')

    expect(formats.map((format) => format.id)).toEqual(['css', 'scss', 'tailwind', 'json', 'url'])
    expect(formats[4].content).toContain('https://palette-lab.test/generador?')
  })

  it('resuelve el texto de un swatch', () => {
    const result = formatSwatchText(state.swatches[0])

    expect(result.text).toMatch(/^#[0-9a-f]{6}$/)
    expect(result.contrast).toBeGreaterThanOrEqual(4.5)
  })

  it('mantiene el JSON crudo y usa un prefijo seguro', () => {
    expect(toJson(state)).toContain('"version": 3')
    expect(toCssVariables(state.swatches, '  ')).toContain('--color-1:')
  })

  it('no falla al descargar si no hay createObjectURL', () => {
    vi.stubGlobal('URL', { createObjectURL: undefined })

    expect(() => download('x.txt', 'hola', 'text/plain')).not.toThrow()
  })

  it('crea y revoca el blob al descargar', () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    download('palette.css', 'body {}', 'text/css')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')

    click.mockRestore()
  })
})
