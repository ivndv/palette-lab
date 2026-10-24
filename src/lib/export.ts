// Formatos de exportación de la paleta

import { bestTextColor, contrastRatio, type Hex, wcagLevel } from './color'
import { BASE_INDEX, type PaletteState, type Swatch } from './palette'
import { toShareUrl } from './share'

// Formatos disponibles en el panel
export type ExportFormatId = 'css' | 'scss' | 'tailwind' | 'json' | 'url'

// Bloque listo para mostrar, copiar o descargar
export interface ExportFormat {
  id: ExportFormatId
  label: string
  content: string
  filename?: string
  mime?: string
}

// Variables CSS con el base incluido
export function toCssVariables(swatches: Swatch[], prefix = 'color'): string {
  const safePrefix = prefix.trim() || 'color'
  const lines = swatches.map((swatch, index) => `  --${safePrefix}-${index + 1}: ${swatch.hex};`)
  const base = swatches[BASE_INDEX]?.hex

  if (base) {
    lines.push(`  --${safePrefix}-base: ${base};`)
  }

  return `:root {\n${lines.join('\n')}\n}\n`
}

// Variables SCSS reutilizables
export function toScssVariables(swatches: Swatch[], prefix = 'color'): string {
  const safePrefix = prefix.trim() || 'color'
  const lines = swatches.map((swatch, index) => `$${safePrefix}-${index + 1}: ${swatch.hex};`)
  const base = swatches[BASE_INDEX]?.hex

  if (base) {
    lines.push(`$${safePrefix}-base: ${base};`)
  }

  return `${lines.join('\n')}\n`
}

// Tema de Tailwind v4
export function toTailwindTheme(swatches: Swatch[]): string {
  const lines = swatches.map((swatch, index) => `  --color-palette-${index + 1}: ${swatch.hex};`)
  const base = swatches[BASE_INDEX]?.hex

  if (base) {
    lines.push(`  --color-palette-base: ${base};`)
  }

  return `@theme {\n${lines.join('\n')}\n}\n`
}

// Estado crudo, útil para reimportar
export function toJson(state: PaletteState): string {
  return `${JSON.stringify(state, null, 2)}\n`
}

// JSON con texto, contraste y nivel WCAG por color
export function toEnrichedJson(state: PaletteState, name = 'Palette Lab'): string {
  const swatches = state.swatches.map((swatch) => {
    const text = bestTextColor(swatch.hex)
    const contrast = contrastRatio(swatch.hex, text)

    return {
      hex: swatch.hex,
      text,
      contrast: Number(contrast.toFixed(2)),
      level: wcagLevel(contrast),
    }
  })

  return `${JSON.stringify(
    {
      version: 1,
      name,
      sourceBase: state.sourceBase,
      base: state.base,
      mode: state.mode,
      tone: state.tone,
      swatches,
    },
    null,
    2,
  )}\n`
}

// Arma la lista completa que consume el panel
export function createExportFormats(state: PaletteState, origin: string): ExportFormat[] {
  return [
    {
      id: 'css',
      label: 'CSS',
      content: toCssVariables(state.swatches),
      filename: 'palette-lab.css',
      mime: 'text/css;charset=utf-8',
    },
    {
      id: 'scss',
      label: 'SCSS',
      content: toScssVariables(state.swatches),
      filename: 'palette-lab.scss',
      mime: 'text/x-scss;charset=utf-8',
    },
    {
      id: 'tailwind',
      label: 'Tailwind',
      content: toTailwindTheme(state.swatches),
      filename: 'palette-lab.tailwind.css',
      mime: 'text/css;charset=utf-8',
    },
    {
      id: 'json',
      label: 'JSON',
      content: toEnrichedJson(state),
      filename: 'palette-lab.json',
      mime: 'application/json;charset=utf-8',
    },
    {
      id: 'url',
      label: 'URL',
      content: toShareUrl(state, origin),
    },
  ]
}

// Texto legible y su contraste para pintar cada card
export function formatSwatchText(swatch: Swatch): { text: Hex; contrast: number } {
  const text = bestTextColor(swatch.hex)

  return {
    text,
    contrast: Number(contrastRatio(swatch.hex, text).toFixed(2)),
  }
}

// Descarga un archivo desde el navegador; falla en silencio si no hay soporte
export function download(filename: string, content: string, mime: string): void {
  if (typeof URL.createObjectURL !== 'function') {
    return
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
