// Atajos de teclado del generador

import { onBeforeUnmount, onMounted } from 'vue'

export interface KeyboardShortcutHandlers {
  regenerate: () => void
  undo: () => void
  redo?: () => void
  randomize: () => void
}

// Evita robar atajos mientras se escribe
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName.toLowerCase()

  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  function onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.repeat) {
      return
    }

    // Ctrl/Cmd + Z deshace; con Shift rehace
    if ((event.metaKey || event.ctrlKey) && !event.altKey) {
      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          handlers.redo?.()
        } else {
          handlers.undo()
        }

        return
      }
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return
    }

    const target = event.target
    const tag = target instanceof HTMLElement ? target.tagName.toLowerCase() : ''

    if (isEditableTarget(target)) {
      return
    }

    // Espacio regenera, salvo sobre botones y links
    if (event.code === 'Space') {
      if (tag === 'button' || tag === 'a') {
        return
      }

      event.preventDefault()
      handlers.regenerate()
      return
    }

    const key = event.key.toLowerCase()

    if (key === 'u') {
      event.preventDefault()
      handlers.undo()
      return
    }

    if (key === 'r') {
      event.preventDefault()
      handlers.randomize()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
  })
}
