// Persistencia diferida del estado de la paleta

import type { PaletteState } from '@/lib/palette'
import type { PaletteStorage } from '@/ports/palette-storage'

export const PERSIST_DELAY_MS = 300

// Agrupa escrituras seguidas y guarda solo el último estado
export class PalettePersistence {
  private readonly storage: PaletteStorage
  private readonly delayMs: number
  private timer: ReturnType<typeof setTimeout> | null = null
  private pending: PaletteState | null = null

  constructor(storage: PaletteStorage, delayMs = PERSIST_DELAY_MS) {
    this.storage = storage
    this.delayMs = delayMs
  }

  schedule(state: PaletteState): void {
    this.pending = state

    if (this.timer) {
      clearTimeout(this.timer)
    }

    this.timer = setTimeout(() => {
      this.timer = null
      this.flush()
    }, this.delayMs)
  }

  flush(): void {
    if (!this.pending) {
      return
    }

    const state = this.pending
    this.pending = null

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    this.storage.save(state)
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    this.pending = null
  }
}
