// Paletas de ejemplo que ofrece el selector

import type { Hex } from './color'
import type { HarmonyMode, PaletteTone } from './palette'

// Combinación base lista para aplicar
export interface Preset {
  id: string
  name: string
  base: Hex
  mode: HarmonyMode
  tone?: PaletteTone
}

// El orden define cómo aparecen en la interfaz
export const PRESETS: Preset[] = [
  {
    id: 'coral',
    name: 'Coral',
    base: '#f97316',
    mode: 'analogous',
    tone: 'vivid',
  },
  {
    id: 'indigo',
    name: 'Índigo',
    base: '#4f46e5',
    mode: 'analogous',
    tone: 'balanced',
  },
  {
    id: 'bosque',
    name: 'Bosque',
    base: '#16a34a',
    mode: 'triadic',
    tone: 'muted',
  },
  {
    id: 'oceano',
    name: 'Océano',
    base: '#0ea5e9',
    mode: 'complementary',
    tone: 'light',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    base: '#d946ef',
    mode: 'triadic',
    tone: 'vivid',
  },
  {
    id: 'grafito',
    name: 'Grafito',
    base: '#64748b',
    mode: 'monochrome',
    tone: 'muted',
  },
  {
    id: 'sorpresa',
    name: 'Sorpresa',
    base: '#8b5cf6',
    mode: 'random',
    tone: 'balanced',
  },
]

// Índigo es el preset que se muestra al abrir el generador
export const DEFAULT_PRESET = PRESETS[1]
