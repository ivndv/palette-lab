// Pruebas de la card de color

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Swatch } from '@/lib/palette'
import ColorCard from './ColorCard.vue'

const swatch: Swatch = {
  id: 'swatch-1',
  hex: '#4f46e5',
  locked: false,
}

describe('ColorCard', () => {
  it('muestra el HEX, HSL y contraste', () => {
    const wrapper = mount(ColorCard, {
      props: { swatch, index: 0, base: false, copied: false },
    })

    expect(wrapper.text()).toContain('#4f46e5')
    expect(wrapper.text()).toContain('243.4°')
    expect(wrapper.text()).toContain('6.29:1')
    expect(wrapper.text()).toContain('AA')
  })

  it('emite toggle-lock al pulsar el candado', async () => {
    const wrapper = mount(ColorCard, {
      props: { swatch, index: 0, base: false, copied: false },
    })

    await wrapper.get('button[aria-label="Bloquear #4f46e5"]').trigger('click')

    expect(wrapper.emitted('toggle-lock')).toEqual([['swatch-1']])
  })

  it('emite copy al pulsar copiar', async () => {
    const wrapper = mount(ColorCard, {
      props: { swatch, index: 0, base: false, copied: false },
    })

    await wrapper.get('button[aria-label="Copiar #4f46e5"]').trigger('click')

    expect(wrapper.emitted('copy')).toEqual([['#4f46e5']])
  })

  it('marca el base como Base y no muestra botón de lock', () => {
    const wrapper = mount(ColorCard, {
      props: { swatch: { ...swatch, locked: true }, index: 2, base: true, copied: false },
    })

    expect(wrapper.text()).toContain('Base')
    expect(wrapper.find('button[aria-label="El color base #4f46e5 está fijo"]').exists()).toBe(
      false,
    )
    expect(wrapper.get('[aria-label="Color base anclado"]').text()).toContain('Base')
  })

  it('muestra el feedback de copiado', () => {
    const wrapper = mount(ColorCard, {
      props: { swatch, index: 0, base: false, copied: true },
    })

    expect(wrapper.text()).toContain('Copiado')
  })
})
