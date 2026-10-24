// Motor de la paleta: estado, historial, persistencia y acciones

// Vue
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'
// Adaptadores
import { localPaletteStorage } from '@/adapters/storage/local-palette-storage'
// Dominio
import { type Hex, hslToHex, normalizeHex } from '@/lib/color'
import {
  adaptBaseToTone,
  BASE_INDEX,
  canRegenerate as canRegenerateSwatches,
  lockedCount as countLocked,
  createSeed,
  createSwatchesFromHexes,
  DEFAULT_TONE,
  generatePalette,
  type HarmonyMode,
  isHarmonyMode,
  isPaletteTone,
  type PaletteTone,
  rebuildPalette,
  regenerateUnlocked,
  type Swatch,
  toggleLock as toggleSwatchLock,
  toneProfile,
} from '@/lib/palette'
import type { Preset } from '@/lib/presets'
import type { SavedPalette } from '@/lib/saved-palette'
import type { SharedPalette } from '@/lib/share'
// Puertos
import type { PaletteStorage } from '@/ports/palette-storage'

// Opciones iniciales del composable
export interface UsePaletteOptions {
  base?: Hex
  mode?: HarmonyMode
  tone?: PaletteTone
  seed?: number
  randomBase?: () => Hex
  persist?: boolean
  storage?: PaletteStorage
}

// Receta que llega desde la IA
export interface PaletteInterpretation {
  base: string
  mode: HarmonyMode
  tone?: PaletteTone
  seed?: number
}

// Foto del estado para undo/redo
interface PaletteSnapshot {
  base: Hex
  sourceBase: Hex
  mode: HarmonyMode
  tone: PaletteTone
  swatches: Swatch[]
  selectedPresetId: string | null
}

// Historial acotado y coalescing del picker de color
const HISTORY_LIMIT = 20
const HISTORY_COALESCE_MS = 300

// Base aleatoria dentro del perfil del tono activo
function defaultRandomBase(tone: PaletteTone = DEFAULT_TONE): Hex {
  const random = createSeed()
  const profile = toneProfile(tone)
  const saturationSpan = profile.saturation.max - profile.saturation.min
  const lightnessSpan = profile.lightness.max - profile.lightness.min

  return hslToHex({
    h: random % 360,
    s: profile.saturation.min + (random % (saturationSpan + 1)),
    l: profile.lightness.min + ((random >>> 8) % (lightnessSpan + 1)),
  })
}

// Copia profunda para no compartir swatches con el historial
function snapshot(
  base: Hex,
  sourceBase: Hex,
  mode: HarmonyMode,
  tone: PaletteTone,
  swatches: Swatch[],
  selectedPresetId: string | null,
): PaletteSnapshot {
  return {
    base,
    sourceBase,
    mode,
    tone,
    swatches: swatches.map((swatch) => ({ ...swatch })),
    selectedPresetId,
  }
}

export function usePalette(options: UsePaletteOptions = {}) {
  const persist = options.persist ?? false
  const storage = options.storage ?? localPaletteStorage
  const storedState = persist ? storage.load() : null
  const initialSourceBase = normalizeHex(
    storedState?.sourceBase ?? storedState?.base ?? options.base ?? '#4f46e5',
  )

  if (!initialSourceBase) {
    throw new Error(`Color base inválido: ${options.base}`)
  }

  const initialTone = storedState?.tone ?? options.tone ?? DEFAULT_TONE

  if (!isPaletteTone(initialTone)) {
    throw new Error(`Tono inválido: ${initialTone}`)
  }

  // Estado
  const seed = ref(options.seed ?? createSeed())
  const sourceBase = ref<Hex>(initialSourceBase)
  const base = ref<Hex>(storedState?.base ?? adaptBaseToTone(initialSourceBase, initialTone))
  const mode = ref<HarmonyMode>(storedState?.mode ?? options.mode ?? 'analogous')
  const tone = ref<PaletteTone>(initialTone)
  const swatches = ref<Swatch[]>(
    storedState?.swatches ??
      generatePalette({
        base: base.value,
        mode: mode.value,
        tone: tone.value,
        seed: seed.value,
      }),
  )
  const error = ref<string | null>(null)
  const selectedPresetId = ref<string | null>(null)
  const history = ref<PaletteSnapshot[]>([])
  const future = ref<PaletteSnapshot[]>([])
  const randomBaseFactory = options.randomBase

  let lastHistoryKind: string | null = null
  let lastHistoryAt = 0

  // Derivados
  const canRegenerate = computed(() => canRegenerateSwatches(swatches.value))
  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const lockedCount = computed(() => countLocked(swatches.value))
  const lockedGeneratedCount = computed(
    () => swatches.value.filter((swatch, index) => index !== BASE_INDEX && swatch.locked).length,
  )

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  // Captura y restauración
  function capture(): PaletteSnapshot {
    return snapshot(
      base.value,
      sourceBase.value,
      mode.value,
      tone.value,
      swatches.value,
      selectedPresetId.value,
    )
  }

  function restore(state: PaletteSnapshot): void {
    base.value = state.base
    sourceBase.value = state.sourceBase
    mode.value = state.mode
    tone.value = state.tone
    swatches.value = state.swatches
    selectedPresetId.value = state.selectedPresetId
    error.value = null
  }

  function resetHistoryCoalesce(): void {
    lastHistoryKind = null
    lastHistoryAt = 0
  }

  // Historial
  function pushHistory(kind: string): void {
    const now = Date.now()

    // El picker de color dispara muchos eventos: agrupa una ráfaga en un paso
    if (
      kind === 'base' &&
      lastHistoryKind === 'base' &&
      now - lastHistoryAt < HISTORY_COALESCE_MS
    ) {
      return
    }

    history.value.push(capture())

    if (history.value.length > HISTORY_LIMIT) {
      history.value.shift()
    }

    future.value = []
    lastHistoryKind = kind
    lastHistoryAt = now
  }

  function pushFuture(state: PaletteSnapshot): void {
    future.value.push(state)

    if (future.value.length > HISTORY_LIMIT) {
      future.value.shift()
    }
  }

  function undo(): void {
    const previous = history.value.pop()

    if (!previous) {
      return
    }

    pushFuture(capture())
    restore(previous)
    resetHistoryCoalesce()
  }

  function redo(): void {
    const next = future.value.pop()

    if (!next) {
      return
    }

    history.value.push(capture())

    if (history.value.length > HISTORY_LIMIT) {
      history.value.shift()
    }

    restore(next)
    resetHistoryCoalesce()
  }

  // Persistencia
  function persistState(): void {
    if (!persist) {
      return
    }

    storage.save({
      version: 3,
      base: base.value,
      sourceBase: sourceBase.value,
      mode: mode.value,
      tone: tone.value,
      swatches: swatches.value,
    })
  }

  function scheduleSave(): void {
    if (!persist) {
      return
    }

    if (saveTimer) {
      clearTimeout(saveTimer)
    }

    saveTimer = setTimeout(() => {
      saveTimer = null
      persistState()
    }, 300)
  }

  if (persist) {
    watch([base, sourceBase, mode, tone, swatches], scheduleSave, { deep: true })
    scheduleSave()
  }

  // Al desmontar se fuerza el guardado pendiente
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
        persistState()
      }
    })
  }

  // Cada cambio de opciones avanza la semilla
  function nextSeed(): number {
    seed.value = (seed.value + 1) >>> 0
    return seed.value
  }

  // Regenera respetando locks y el base
  function rebuild(nextBase: Hex, nextMode: HarmonyMode, nextTone: PaletteTone): void {
    swatches.value = rebuildPalette(swatches.value, {
      base: nextBase,
      mode: nextMode,
      tone: nextTone,
      seed: nextSeed(),
    })
  }

  // Acciones
  function setBase(value: string): boolean {
    const normalized = normalizeHex(value)

    if (!normalized) {
      error.value = 'HEX inválido. Usa #rrggbb.'
      return false
    }

    error.value = null

    if (normalized === sourceBase.value) {
      return true
    }

    pushHistory('base')
    sourceBase.value = normalized
    base.value = adaptBaseToTone(normalized, tone.value)
    selectedPresetId.value = null
    rebuild(base.value, mode.value, tone.value)

    return true
  }

  function setMode(nextMode: HarmonyMode): void {
    if (!isHarmonyMode(nextMode)) {
      error.value = 'Modo de armonía inválido.'
      return
    }

    if (nextMode === mode.value) {
      return
    }

    pushHistory('mode')
    mode.value = nextMode
    selectedPresetId.value = null
    error.value = null
    rebuild(base.value, nextMode, tone.value)
  }

  function setTone(nextTone: PaletteTone): void {
    if (!isPaletteTone(nextTone)) {
      error.value = 'Tono inválido.'
      return
    }

    if (nextTone === tone.value) {
      return
    }

    pushHistory('tone')
    tone.value = nextTone
    base.value = adaptBaseToTone(sourceBase.value, nextTone)
    selectedPresetId.value = null
    error.value = null
    rebuild(base.value, mode.value, nextTone)
  }

  function regenerate(): void {
    if (!canRegenerate.value) {
      return
    }

    pushHistory('regenerate')
    swatches.value = regenerateUnlocked(swatches.value, {
      base: base.value,
      mode: mode.value,
      tone: tone.value,
      seed: nextSeed(),
    })
  }

  function toggleLock(id: string): void {
    const index = swatches.value.findIndex((swatch) => swatch.id === id)

    // El base no se puede bloquear
    if (index === -1 || index === BASE_INDEX) {
      return
    }

    pushHistory('lock')
    swatches.value = toggleSwatchLock(swatches.value, id)
  }

  function unlockAll(): void {
    const hasGeneratedLocks = swatches.value.some(
      (swatch, index) => index !== BASE_INDEX && swatch.locked,
    )

    if (!hasGeneratedLocks) {
      return
    }

    pushHistory('unlock-all')
    swatches.value = swatches.value.map((swatch, index) =>
      index === BASE_INDEX ? swatch : { ...swatch, locked: false },
    )
  }

  function applyPreset(preset: Preset): void {
    const presetTone = preset.tone ?? DEFAULT_TONE

    pushHistory('preset')
    sourceBase.value = preset.base
    base.value = adaptBaseToTone(preset.base, presetTone)
    mode.value = preset.mode
    tone.value = presetTone
    selectedPresetId.value = preset.id
    error.value = null

    swatches.value = rebuildPalette(swatches.value, {
      base: base.value,
      mode: preset.mode,
      tone: presetTone,
      seed: nextSeed(),
    })
  }

  function randomizeBase(): void {
    const nextBase = randomBaseFactory ? randomBaseFactory() : defaultRandomBase(tone.value)

    setBase(nextBase)
  }

  function applySavedPalette(saved: SavedPalette): void {
    const nextSwatches = createSwatchesFromHexes(saved.swatches)

    pushHistory('saved')
    sourceBase.value = saved.sourceBase
    base.value = saved.base
    mode.value = saved.mode
    tone.value = saved.tone
    swatches.value = nextSwatches
    selectedPresetId.value = null
    error.value = null
  }

  // Rechaza paletas compartidas manipuladas o incompletas
  function applySharedPalette(shared: SharedPalette): boolean {
    const source = normalizeHex(shared.sourceBase)
    const normalizedBase = normalizeHex(shared.base)

    if (!source || !normalizedBase || !isHarmonyMode(shared.mode) || !isPaletteTone(shared.tone)) {
      error.value = 'La paleta compartida es inválida.'
      return false
    }

    let nextSwatches: Swatch[]

    try {
      nextSwatches = createSwatchesFromHexes(shared.swatches)
    } catch {
      error.value = 'La paleta compartida es inválida.'
      return false
    }

    if (nextSwatches[BASE_INDEX].hex !== normalizedBase) {
      error.value = 'El color base compartido no está anclado.'
      return false
    }

    pushHistory('shared')
    sourceBase.value = source
    base.value = normalizedBase
    mode.value = shared.mode
    tone.value = shared.tone
    swatches.value = nextSwatches
    selectedPresetId.value = null
    error.value = null

    return true
  }

  // Aplica la receta de la IA y usa su semilla si viene
  function applyInterpretation(interpretation: PaletteInterpretation): boolean {
    const normalizedBase = normalizeHex(interpretation.base)

    if (!normalizedBase) {
      error.value = 'HEX inválido. Usa #rrggbb.'
      return false
    }

    if (!isHarmonyMode(interpretation.mode)) {
      error.value = 'Modo de armonía inválido.'
      return false
    }

    const nextTone = interpretation.tone ?? DEFAULT_TONE

    if (!isPaletteTone(nextTone)) {
      error.value = 'Tono inválido.'
      return false
    }

    const nextBase = adaptBaseToTone(normalizedBase, nextTone)

    pushHistory('interpretation')
    sourceBase.value = normalizedBase
    base.value = nextBase
    mode.value = interpretation.mode
    tone.value = nextTone
    selectedPresetId.value = null
    error.value = null

    swatches.value = rebuildPalette(swatches.value, {
      base: nextBase,
      mode: interpretation.mode,
      tone: nextTone,
      seed: interpretation.seed ?? nextSeed(),
    })

    return true
  }

  return {
    base,
    sourceBase,
    mode,
    tone,
    swatches,
    error,
    selectedPresetId,
    canRegenerate,
    canUndo,
    canRedo,
    lockedCount,
    lockedGeneratedCount,
    setBase,
    setMode,
    setTone,
    regenerate,
    undo,
    redo,
    toggleLock,
    unlockAll,
    applyPreset,
    randomizeBase,
    applySavedPalette,
    applySharedPalette,
    applyInterpretation,
  }
}
