// Pruebas de copiado al portapapeles

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useClipboard } from './useClipboard'

const originalExecCommand = document.execCommand

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Object.defineProperty(document, 'execCommand', {
    value: originalExecCommand,
    configurable: true,
  })
})

describe('useClipboard', () => {
  it('copia con la Clipboard API y limpia el estado', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const clipboard = useClipboard(1000)
    const copied = await clipboard.copy('#4f46e5', 'swatch-1')

    expect(copied).toBe(true)
    expect(writeText).toHaveBeenCalledWith('#4f46e5')
    expect(clipboard.copiedId.value).toBe('swatch-1')
    expect(clipboard.isCopied('swatch-1')).toBe(true)

    vi.advanceTimersByTime(1000)

    expect(clipboard.copiedId.value).toBeNull()
    expect(clipboard.isCopied('swatch-1')).toBe(false)
  })

  it('mantiene el último valor copiado si se copia dos veces', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const clipboard = useClipboard(1000)

    await clipboard.copy('uno', 'uno')
    vi.advanceTimersByTime(500)
    await clipboard.copy('dos', 'dos')
    vi.advanceTimersByTime(700)

    expect(clipboard.copiedId.value).toBe('dos')

    vi.advanceTimersByTime(300)

    expect(clipboard.copiedId.value).toBeNull()
  })

  it('devuelve false si la Clipboard API falla', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denegado'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const clipboard = useClipboard()
    const copied = await clipboard.copy('texto')

    expect(copied).toBe(false)
    expect(clipboard.copiedId.value).toBeNull()
  })

  it('usa el fallback cuando no existe Clipboard API', async () => {
    vi.stubGlobal('navigator', {})
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      configurable: true,
    })

    const clipboard = useClipboard()
    const copied = await clipboard.copy('#abcdef')

    expect(copied).toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(clipboard.copiedId.value).toBe('#abcdef')
  })

  it('devuelve false si el fallback no está disponible', async () => {
    vi.stubGlobal('navigator', {})
    Object.defineProperty(document, 'execCommand', {
      value: undefined,
      configurable: true,
    })

    const clipboard = useClipboard()
    const copied = await clipboard.copy('texto')

    expect(copied).toBe(false)
    expect(clipboard.copiedId.value).toBeNull()
  })

  it('registra la limpieza al desmontar el componente', () => {
    const Component = defineComponent({
      setup() {
        useClipboard()
        return () => h('div')
      },
    })

    const wrapper = mount(Component)

    expect(wrapper.exists()).toBe(true)
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
