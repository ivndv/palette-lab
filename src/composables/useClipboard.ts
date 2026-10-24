// Copiado al portapapeles con feedback temporal

import { getCurrentInstance, onBeforeUnmount, ref } from 'vue'

// Fallback para navegadores sin Clipboard API
function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'

  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (typeof document.execCommand !== 'function' || !document.execCommand('copy')) {
      throw new Error('No se pudo copiar')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}

export function useClipboard(timeout = 1500) {
  const copiedId = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  // Devuelve false si el navegador bloquea la escritura
  async function copy(text: string, id = text): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        fallbackCopy(text)
      }

      copiedId.value = id
      clearTimer()
      timer = setTimeout(() => {
        copiedId.value = null
        timer = null
      }, timeout)

      return true
    } catch {
      copiedId.value = null
      return false
    }
  }

  function isCopied(id: string): boolean {
    return copiedId.value === id
  }

  // Fuera de un componente no hay ciclo de vida que limpiar
  if (getCurrentInstance()) {
    onBeforeUnmount(clearTimer)
  }

  return {
    copiedId,
    copy,
    isCopied,
  }
}
