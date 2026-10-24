// Pruebas de los atajos de teclado

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

function mountShortcuts() {
  const handlers = {
    regenerate: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    randomize: vi.fn(),
  }

  const component = defineComponent({
    setup() {
      useKeyboardShortcuts(handlers)
      return () => null
    },
  })

  const wrapper = mount(component, { attachTo: document.body })

  return { wrapper, handlers }
}

function press(
  key: string,
  options: KeyboardEventInit = {},
  target: EventTarget = window,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    code: options.code ?? `Key${key.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    ...options,
  })

  target.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcuts', () => {
  it('regenera con Espacio, deshace con U y aleatoriza con R', () => {
    const { wrapper, handlers } = mountShortcuts()

    const space = press(' ', { code: 'Space' })
    const u = press('u')
    const r = press('r')

    expect(handlers.regenerate).toHaveBeenCalledTimes(1)
    expect(handlers.undo).toHaveBeenCalledTimes(1)
    expect(handlers.randomize).toHaveBeenCalledTimes(1)
    expect(space.defaultPrevented).toBe(true)
    expect(u.defaultPrevented).toBe(true)
    expect(r.defaultPrevented).toBe(true)

    wrapper.unmount()
  })

  it('maneja Ctrl/Cmd + Z y Ctrl/Cmd + Shift + Z', () => {
    const { wrapper, handlers } = mountShortcuts()

    press('z', { ctrlKey: true })
    press('z', { metaKey: true, shiftKey: true })

    expect(handlers.undo).toHaveBeenCalledTimes(1)
    expect(handlers.redo).toHaveBeenCalledTimes(1)

    press('z', { altKey: true })
    press('s', { ctrlKey: true })

    expect(handlers.undo).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('ignora eventos repetidos o ya prevenidos', () => {
    const { wrapper, handlers } = mountShortcuts()

    press(' ', { code: 'Space', repeat: true })
    const prevented = new KeyboardEvent('keydown', {
      key: 'u',
      code: 'KeyU',
      bubbles: true,
      cancelable: true,
    })
    prevented.preventDefault()
    window.dispatchEvent(prevented)

    expect(handlers.regenerate).not.toHaveBeenCalled()
    expect(handlers.undo).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('ignora inputs, textareas, selects y contenteditable', () => {
    const { wrapper, handlers } = mountShortcuts()
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')

    editable.contentEditable = 'true'
    document.body.append(input, textarea, select, editable)

    press('u', {}, input)
    press('u', {}, textarea)
    press('u', {}, select)
    press('u', {}, editable)

    expect(handlers.undo).not.toHaveBeenCalled()

    input.remove()
    textarea.remove()
    select.remove()
    editable.remove()
    wrapper.unmount()
  })

  it('no regenera con Espacio sobre un botón o link', () => {
    const { wrapper, handlers } = mountShortcuts()
    const button = document.createElement('button')
    const link = document.createElement('a')

    document.body.append(button, link)

    press(' ', { code: 'Space' }, button)
    press(' ', { code: 'Space' }, link)

    expect(handlers.regenerate).not.toHaveBeenCalled()

    button.remove()
    link.remove()
    wrapper.unmount()
  })

  it('remueve el listener al desmontar', () => {
    const { wrapper, handlers } = mountShortcuts()

    wrapper.unmount()
    press('u')

    expect(handlers.undo).not.toHaveBeenCalled()
  })
})
