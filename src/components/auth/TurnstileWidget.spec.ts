// Pruebas del widget de Turnstile

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import TurnstileWidget from './TurnstileWidget.vue'

const state = vi.hoisted(() => ({
  enabled: true,
  fail: false,
  api: {
    render: vi.fn((_container: HTMLElement, _options: unknown) => 'widget-1'),
    reset: vi.fn((_widgetId?: string) => undefined),
    remove: vi.fn((_widgetId?: string) => undefined),
  },
}))

vi.mock('@/lib/turnstile', () => ({
  isTurnstileEnabled: () => state.enabled,
  getTurnstileSiteKey: () => 'site-key',
  loadTurnstile: () =>
    state.fail
      ? Promise.reject(new Error('No pudimos cargar Turnstile.'))
      : Promise.resolve(state.api),
}))

function renderOptions(): Record<string, unknown> {
  return state.api.render.mock.calls[0]?.[1] as Record<string, unknown>
}

beforeEach(() => {
  state.enabled = true
  state.fail = false
  state.api.render.mockClear()
  state.api.reset.mockClear()
  state.api.remove.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TurnstileWidget', () => {
  it('renderiza el widget y emite el token', async () => {
    const wrapper = mount(TurnstileWidget)
    await flushPromises()

    expect(state.api.render).toHaveBeenCalledTimes(1)

    const options = renderOptions()

    expect(options.sitekey).toBe('site-key')
    expect(options.theme).toBe('auto')
    expect(options.size).toBe('flexible')

    ;(options.callback as (token: string) => void)('token-123')

    expect(wrapper.emitted('token')?.at(-1)).toEqual(['token-123'])
  })

  it('limpia el token cuando expira o falla', async () => {
    const wrapper = mount(TurnstileWidget)
    await flushPromises()

    const options = renderOptions()

    ;(options.callback as (token: string) => void)('token-123')
    ;(options['expired-callback'] as () => void)()

    expect(wrapper.emitted('token')?.at(-1)).toEqual([''])

    ;(options['error-callback'] as () => void)()
    await nextTick()

    expect(wrapper.emitted('token')?.at(-1)).toEqual([''])
    expect(wrapper.text()).toContain('No pudimos cargar la verificación')
  })

  it('expone reset y remueve el widget al desmontar', async () => {
    const wrapper = mount(TurnstileWidget)
    await flushPromises()

    ;(wrapper.vm as unknown as { reset: () => void }).reset()

    expect(wrapper.emitted('token')?.at(-1)).toEqual([''])
    expect(state.api.reset).toHaveBeenCalledWith('widget-1')

    wrapper.unmount()

    expect(state.api.remove).toHaveBeenCalledWith('widget-1')
  })

  it('muestra el aviso si falta la site key', async () => {
    state.enabled = false
    const wrapper = mount(TurnstileWidget)
    await flushPromises()

    expect(state.api.render).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('VITE_TURNSTILE_SITE_KEY')
  })

  it('avisa si el script no carga', async () => {
    state.fail = true
    const wrapper = mount(TurnstileWidget)
    await flushPromises()

    expect(wrapper.text()).toContain('No pudimos cargar la verificación')
    expect(wrapper.emitted('token')?.at(-1)).toEqual([''])
  })
})
