// Pruebas de la barra de control

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Hex } from '@/lib/color'
import { PRESETS } from '@/lib/presets'
import PaletteToolbar from './PaletteToolbar.vue'

const base: Hex = '#4f46e5'

function mountToolbar(overrides: Record<string, unknown> = {}) {
  return mount(PaletteToolbar, {
    props: {
      base,
      appliedBase: base,
      mode: 'analogous',
      tone: 'balanced',
      canRegenerate: true,
      lockedCount: 0,
      presets: PRESETS,
      selectedPresetId: null,
      ...overrides,
    },
  })
}

function buttonByText(wrapper: ReturnType<typeof mountToolbar>, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().trim() === label)

  if (!button) {
    throw new Error(`No se encontró el botón ${label}`)
  }

  return button
}

describe('PaletteToolbar', () => {
  it('emite el cambio de modo', async () => {
    const wrapper = mountToolbar()

    await buttonByText(wrapper, 'Tríada').trigger('click')

    expect(wrapper.emitted('update:mode')).toEqual([['triadic']])
  })

  it('emite el preset seleccionado', async () => {
    const wrapper = mountToolbar()

    await buttonByText(wrapper, 'Coral').trigger('click')

    expect(wrapper.emitted('apply-preset')).toEqual([[PRESETS[0]]])
  })

  it('emite regenerar y aleatorio', async () => {
    const wrapper = mountToolbar()

    await buttonByText(wrapper, 'Regenerar').trigger('click')
    await buttonByText(wrapper, 'Aleatorio').trigger('click')

    expect(wrapper.emitted('regenerate')).toHaveLength(1)
    expect(wrapper.emitted('randomize')).toHaveLength(1)
  })

  it('valida el HEX antes de emitir', async () => {
    const wrapper = mountToolbar()
    const input = wrapper.get('input[aria-label="HEX del color base"]')

    await input.setValue('nope')
    await input.trigger('blur')

    expect(wrapper.text()).toContain('HEX inválido. Usa #rrggbb.')
    expect(wrapper.emitted('update:base')).toBeUndefined()

    await input.setValue('#f97316')
    await input.trigger('blur')

    expect(wrapper.emitted('update:base')).toEqual([['#f97316']])
  })

  it('emite el color del selector nativo', async () => {
    const wrapper = mountToolbar()
    const picker = wrapper.get('input[type="color"]')

    await picker.setValue('#f97316')

    expect(wrapper.emitted('update:base')).toEqual([['#f97316']])
  })

  it('deshabilita regenerar cuando no hay colores libres', () => {
    const wrapper = mountToolbar({ canRegenerate: false })
    const button = buttonByText(wrapper, 'Regenerar')

    expect(button.attributes('disabled')).toBeDefined()
  })

  it('marca el preset activo', () => {
    const wrapper = mountToolbar({ selectedPresetId: 'coral' })
    const preset = buttonByText(wrapper, 'Coral')

    expect(preset.classes()).toContain('palette-toolbar__chip--active')
    expect(preset.attributes('aria-pressed')).toBe('true')
  })

  it('muestra la descripción del modo activo', () => {
    const wrapper = mountToolbar({ mode: 'triadic' })

    expect(wrapper.text()).toContain('Tres tonos equidistantes')
  })

  it('emite el cambio de tono', async () => {
    const wrapper = mountToolbar()
    const select = wrapper.get('select[aria-label="Tono de la paleta"]')

    await select.setValue('pastel')

    expect(wrapper.emitted('update:tone')).toEqual([['pastel']])
  })

  it('muestra la descripción del tono activo', () => {
    const wrapper = mountToolbar({ tone: 'dark' })

    expect(wrapper.text()).toContain('Luminosidad baja')
  })

  it('muestra el base aplicado cuando el tono lo adapta', () => {
    const wrapper = mountToolbar({ appliedBase: '#9b97d8', tone: 'pastel' })

    expect(wrapper.text()).toContain('se aplica')
    expect(wrapper.text()).toContain('#9b97d8')
  })
})
