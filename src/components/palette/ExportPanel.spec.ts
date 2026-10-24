// Pruebas del panel de exportación

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ExportFormat } from '@/lib/export'
import ExportPanel from './ExportPanel.vue'

const formats: ExportFormat[] = [
  {
    id: 'css',
    label: 'CSS',
    content: ':root {}',
    filename: 'palette.css',
    mime: 'text/css',
  },
  {
    id: 'url',
    label: 'URL',
    content: 'https://palette-lab.test/generador?b=%234f46e5',
  },
]

describe('ExportPanel', () => {
  it('muestra el grupo de formatos y el preview', () => {
    const wrapper = mount(ExportPanel, {
      props: { formats, copiedId: null },
    })

    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('Formato de exportación')
    expect(wrapper.get('pre').text()).toContain(':root {}')

    const tabs = wrapper.findAll('[role="group"] button')
    expect(tabs[0].attributes('aria-pressed')).toBe('true')
    expect(tabs[1].attributes('aria-pressed')).toBe('false')
  })

  it('emite copiar y descargar el formato activo', async () => {
    const wrapper = mount(ExportPanel, {
      props: { formats, copiedId: null },
    })

    const buttons = wrapper.findAll('button')
    const copy = buttons.find((button) => button.text().includes('Copiar'))
    const download = buttons.find((button) => button.text().includes('Descargar'))

    if (!copy || !download) {
      throw new Error('Faltan acciones de exportar')
    }

    await copy.trigger('click')
    await download.trigger('click')

    expect(wrapper.emitted('copy')?.[0]).toEqual([formats[0]])
    expect(wrapper.emitted('download')?.[0]).toEqual([formats[0]])
  })

  it('muestra Abrir URL en vez de descargar para el formato URL', async () => {
    const wrapper = mount(ExportPanel, {
      props: { formats, copiedId: null },
    })

    const tabs = wrapper.findAll('[role="group"] button')
    await tabs[1].trigger('click')

    expect(wrapper.get('a').attributes('href')).toBe(formats[1].content)
    expect(wrapper.text()).toContain('Abrir URL')
    expect(wrapper.text()).not.toContain('Descargar')
  })
})
