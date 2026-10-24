// Pruebas de conversión de color y contraste

import { describe, expect, it } from 'vitest'
import {
  bestTextColor,
  contrastRatio,
  type Hex,
  hexToHsl,
  hexToRgb,
  hslToHex,
  normalizeHex,
  relativeLuminance,
  rgbToHsl,
  wcagLevel,
  wrapHue,
} from './color'

const ROUND_TRIP_COLORS: Hex[] = [
  '#4f46e5',
  '#f97316',
  '#10b981',
  '#ef4444',
  '#f8fafc',
  '#0f172a',
  '#777777',
  '#abcdef',
  '#123456',
  '#fedcba',
  '#00ff00',
  '#0000ff',
  '#ff00ff',
  '#00ffff',
  '#ffff00',
  '#808080',
  '#c084fc',
  '#facc15',
  '#0ea5e9',
  '#be123c',
]

describe('normalizeHex', () => {
  it('expande HEX de 3 dígitos', () => {
    expect(normalizeHex('ABC')).toBe('#aabbcc')
    expect(normalizeHex('#AbC')).toBe('#aabbcc')
  })

  it('normaliza HEX de 6 dígitos', () => {
    expect(normalizeHex('#4F46E5')).toBe('#4f46e5')
    expect(normalizeHex('4f46e5')).toBe('#4f46e5')
    expect(normalizeHex('  #4F46E5  ')).toBe('#4f46e5')
  })

  it('rechaza formatos inválidos', () => {
    for (const value of ['', '#', '#abcd', '#aabbccdd', 'ggg', '#12', 'abcde']) {
      expect(normalizeHex(value)).toBeNull()
    }
  })
})

describe('hexToRgb', () => {
  it('convierte HEX a canales RGB', () => {
    expect(hexToRgb('#4f46e5')).toEqual({ r: 79, g: 70, b: 229 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('lanza un error con HEX inválido', () => {
    expect(() => hexToRgb('#nope' as Hex)).toThrow('HEX inválido')
  })
})

describe('rgbToHsl', () => {
  it('convierte rojo, verde y azul puros', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50 })
  })

  it('devuelve saturación cero para grises', () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50.19607843137255 })
  })

  it('limita canales fuera de rango', () => {
    expect(rgbToHsl({ r: 300, g: -20, b: 0 })).toEqual({ h: 0, s: 100, l: 50 })
  })
})

describe('hslToRgb y hslToHex', () => {
  it('convierte los seis sectores del círculo cromático', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 60, s: 100, l: 50 })).toBe('#ffff00')
    expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe('#00ff00')
    expect(hslToHex({ h: 180, s: 100, l: 50 })).toBe('#00ffff')
    expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe('#0000ff')
    expect(hslToHex({ h: 300, s: 100, l: 50 })).toBe('#ff00ff')
  })

  it('normaliza el hue y limita saturación/luminosidad', () => {
    expect(hslToHex({ h: 360, s: 100, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: -120, s: 100, l: 50 })).toBe('#0000ff')
    expect(hslToHex({ h: 0, s: 200, l: 50 })).toBe('#ff0000')
    expect(hslToHex({ h: 0, s: 100, l: 150 })).toBe('#ffffff')
  })

  it('genera blanco, negro y grises', () => {
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe('#000000')
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe('#ffffff')
    expect(hslToHex({ h: 0, s: 0, l: 50 })).toBe('#808080')
  })
})

describe('hexToHsl', () => {
  it('convierte HEX a HSL', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 })
    expect(hexToHsl('#00ff00')).toEqual({ h: 120, s: 100, l: 50 })
    expect(hexToHsl('#0000ff')).toEqual({ h: 240, s: 100, l: 50 })
    expect(hexToHsl('#808080').s).toBe(0)
  })

  it('hace round-trip HEX → HSL → HEX sin pérdida', () => {
    for (const hex of ROUND_TRIP_COLORS) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex)
    }
  })
})

describe('wrapHue', () => {
  it('normaliza el tono a [0, 360)', () => {
    expect(wrapHue(370)).toBe(10)
    expect(wrapHue(-10)).toBe(350)
    expect(wrapHue(360)).toBe(0)
    expect(wrapHue(720)).toBe(0)
    expect(wrapHue(0)).toBe(0)
    expect(wrapHue(359.5)).toBe(359.5)
  })

  it('rechaza valores no finitos', () => {
    expect(() => wrapHue(Number.NaN)).toThrow('Hue inválido')
    expect(() => wrapHue(Number.POSITIVE_INFINITY)).toThrow('Hue inválido')
  })
})

describe('relativeLuminance y contrastRatio', () => {
  it('calcula la luminancia WCAG', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10)
    expect(relativeLuminance('#777777')).toBeCloseTo(0.184, 3)
  })

  it('calcula el contraste máximo y el caso #777 sobre blanco', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
    expect(contrastRatio('#ffffff', '#777777')).toBeCloseTo(4.48, 2)
  })
})

describe('wcagLevel', () => {
  it('clasifica los niveles WCAG', () => {
    expect(wcagLevel(21)).toBe('AAA')
    expect(wcagLevel(7)).toBe('AAA')
    expect(wcagLevel(4.5)).toBe('AA')
    expect(wcagLevel(4.49)).toBe('AA Large')
    expect(wcagLevel(3)).toBe('AA Large')
    expect(wcagLevel(2.99)).toBe('Fail')
  })
})

describe('bestTextColor', () => {
  it('elige negro o blanco según el contraste', () => {
    expect(bestTextColor('#ffffff')).toBe('#000000')
    expect(bestTextColor('#000000')).toBe('#ffffff')
    expect(bestTextColor('#777777')).toBe('#000000')
    expect(bestTextColor('#4f46e5')).toBe('#ffffff')
    expect(bestTextColor('#f8fafc')).toBe('#000000')
  })

  it('garantiza contraste AA en una muestra amplia de colores', () => {
    for (let hue = 0; hue < 360; hue += 15) {
      for (let saturation = 0; saturation <= 100; saturation += 20) {
        for (let lightness = 0; lightness <= 100; lightness += 10) {
          const hex = hslToHex({ h: hue, s: saturation, l: lightness })
          const text = bestTextColor(hex)

          expect(contrastRatio(hex, text)).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })
})
