// Conversión entre HEX, RGB y HSL, más contraste WCAG

// HEX canónico en minúsculas, siempre con numeral
export type Hex = `#${string}`

// Canales RGB en el rango 0..255
export interface RGB {
  r: number
  g: number
  b: number
}

// Hue 0..360, saturación y luminosidad 0..100
export interface HSL {
  h: number
  s: number
  l: number
}

// Nivel de contraste según WCAG 2.1
export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail'

// Acepta 3 o 6 dígitos, con o sin numeral
const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
const BLACK: Hex = '#000000'
const WHITE: Hex = '#ffffff'

// Limita un valor a un rango cerrado
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Pasa un canal a dos dígitos hexadecimales
function toHexChannel(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')
}

// Convierte un HEX validado a canales RGB
function parseHex(hex: Hex): RGB {
  const normalized = normalizeHex(hex)

  if (!normalized) {
    throw new Error(`HEX inválido: ${hex}`)
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

// Acepta abc, #abc o #aabbcc y devuelve el HEX canónico
export function normalizeHex(input: string): Hex | null {
  const value = input.trim().toLowerCase()
  const match = HEX_PATTERN.exec(value)

  if (!match) {
    return null
  }

  // Expande el formato corto duplicando cada dígito
  const digits = match[1]
  const expanded =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => `${digit}${digit}`)
          .join('')
      : digits

  return `#${expanded}` as Hex
}

// Devuelve los canales RGB de un HEX
export function hexToRgb(hex: Hex): RGB {
  return parseHex(hex)
}

// Convierte RGB a HSL
export function rgbToHsl(rgb: RGB): HSL {
  // 1. Normaliza los canales a 0..1
  const red = clamp(rgb.r, 0, 255) / 255
  const green = clamp(rgb.g, 0, 255) / 255
  const blue = clamp(rgb.b, 0, 255) / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const lightness = (max + min) / 2

  let hue = 0
  let saturation = 0

  // 2. Deriva hue y saturación solo si hay diferencia entre canales
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6
    } else if (max === green) {
      hue = (blue - red) / delta + 2
    } else {
      hue = (red - green) / delta + 4
    }

    hue *= 60
    saturation = delta / (1 - Math.abs(2 * lightness - 1))
  }

  return {
    h: wrapHue(hue),
    s: saturation * 100,
    l: lightness * 100,
  }
}

// Convierte HSL a RGB
export function hslToRgb(hsl: HSL): RGB {
  const hue = wrapHue(hsl.h)
  const saturation = clamp(hsl.s, 0, 100) / 100
  const lightness = clamp(hsl.l, 0, 100) / 100

  // 1. Calcula chroma, el ajuste de luminosidad y el segundo componente
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const match = lightness - chroma / 2

  let red = 0
  let green = 0
  let blue = 0

  // 2. Ubica el hue en su sector de 60 grados
  if (hue < 60) {
    red = chroma
    green = x
  } else if (hue < 120) {
    red = x
    green = chroma
  } else if (hue < 180) {
    green = chroma
    blue = x
  } else if (hue < 240) {
    green = x
    blue = chroma
  } else if (hue < 300) {
    red = x
    blue = chroma
  } else {
    red = chroma
    blue = x
  }

  // 3. Suma el ajuste y devuelve canales 0..255
  return {
    r: clamp(Math.round((red + match) * 255), 0, 255),
    g: clamp(Math.round((green + match) * 255), 0, 255),
    b: clamp(Math.round((blue + match) * 255), 0, 255),
  }
}

// Convierte HSL a HEX canónico
export function hslToHex(hsl: HSL): Hex {
  const rgb = hslToRgb(hsl)
  return `#${toHexChannel(rgb.r)}${toHexChannel(rgb.g)}${toHexChannel(rgb.b)}` as Hex
}

// Convierte HEX a HSL
export function hexToHsl(hex: Hex): HSL {
  return rgbToHsl(hexToRgb(hex))
}

// Normaliza un hue al rango 0..360
export function wrapHue(hue: number): number {
  if (!Number.isFinite(hue)) {
    throw new Error(`Hue inválido: ${hue}`)
  }

  return ((hue % 360) + 360) % 360
}

// Luminancia relativa según WCAG 2.1
export function relativeLuminance(hex: Hex): number {
  const rgb = hexToRgb(hex)
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

// Relación de contraste entre dos colores, de 1 a 21
export function contrastRatio(a: Hex, b: Hex): number {
  const luminanceA = relativeLuminance(a)
  const luminanceB = relativeLuminance(b)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)

  return (lighter + 0.05) / (darker + 0.05)
}

// Clasifica un ratio según los umbrales AA y AAA
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) {
    return 'AAA'
  }

  if (ratio >= 4.5) {
    return 'AA'
  }

  if (ratio >= 3) {
    return 'AA Large'
  }

  return 'Fail'
}

// Elige negro o blanco según cuál contraste más con el fondo
export function bestTextColor(background: Hex): Hex {
  const blackContrast = contrastRatio(background, BLACK)
  const whiteContrast = contrastRatio(background, WHITE)

  return blackContrast >= whiteContrast ? BLACK : WHITE
}
