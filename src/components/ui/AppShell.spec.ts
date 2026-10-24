// Pruebas del shell accesible

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppShell from './AppShell.vue'

describe('AppShell', () => {
  it('incluye skip link y un main enfocable', () => {
    const wrapper = mount(AppShell, {
      slots: {
        default: '<p>Contenido</p>',
      },
    })

    const skip = wrapper.get('a[href="#contenido"]')
    const main = wrapper.get('main#contenido')

    expect(skip.text()).toBe('Saltar al contenido')
    expect(main.attributes('tabindex')).toBe('-1')
    expect(wrapper.text()).toContain('Contenido')
  })
})
