// Historial acotado con coalescing para undo/redo

export const HISTORY_LIMIT = 20
export const HISTORY_COALESCE_MS = 300

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
}

// Estructura pura: no conoce Vue ni el DOM
export class PaletteHistory<T> {
  private readonly onChange?: (state: HistoryState) => void
  private readonly limit: number
  private readonly coalesceMs: number
  private past: T[] = []
  private future: T[] = []
  private lastKind: string | null = null
  private lastAt = 0

  constructor(
    onChange?: (state: HistoryState) => void,
    limit = HISTORY_LIMIT,
    coalesceMs = HISTORY_COALESCE_MS,
  ) {
    this.onChange = onChange
    this.limit = limit
    this.coalesceMs = coalesceMs
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  // El picker de color dispara muchos eventos: agrupa una ráfaga en un paso
  push(kind: string, value: T, now = Date.now()): void {
    if (kind === 'base' && this.lastKind === 'base' && now - this.lastAt < this.coalesceMs) {
      return
    }

    this.past.push(value)

    if (this.past.length > this.limit) {
      this.past.shift()
    }

    this.future = []
    this.lastKind = kind
    this.lastAt = now
    this.notify()
  }

  undo(current: T): T | null {
    const previous = this.past.pop()

    if (!previous) {
      return null
    }

    this.pushFuture(current)
    this.resetCoalesce()
    this.notify()

    return previous
  }

  redo(current: T): T | null {
    const next = this.future.pop()

    if (!next) {
      return null
    }

    this.past.push(current)

    if (this.past.length > this.limit) {
      this.past.shift()
    }

    this.resetCoalesce()
    this.notify()

    return next
  }

  private pushFuture(value: T): void {
    this.future.push(value)

    if (this.future.length > this.limit) {
      this.future.shift()
    }
  }

  private resetCoalesce(): void {
    this.lastKind = null
    this.lastAt = 0
  }

  private notify(): void {
    this.onChange?.({ canUndo: this.canUndo, canRedo: this.canRedo })
  }
}
