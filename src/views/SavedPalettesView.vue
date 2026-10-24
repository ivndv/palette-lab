<script setup lang="ts">
// Listado de paletas guardadas: abrir, renombrar, duplicar y eliminar

// Pinia
import { storeToRefs } from 'pinia'
// Vue
import { onMounted, ref, watch } from 'vue'
// Router
import { RouterLink, useRouter } from 'vue-router'
// Componentes
import AppButton from '@/components/ui/AppButton.vue'
// Dominio
import { HARMONY_MODES, type HarmonyMode, PALETTE_TONES, type PaletteTone } from '@/lib/palette'
import type { SavedPalette } from '@/lib/saved-palette'
// Stores
import { useAuthStore } from '@/stores/auth'
import { usePaletteStore } from '@/stores/palette'
import { useSavedPalettesStore } from '@/stores/saved-palettes'

const auth = useAuthStore()
const savedStore = useSavedPalettesStore()
const paletteStore = usePaletteStore()
const { palettes, loading, error } = storeToRefs(savedStore)
const router = useRouter()

// Estado de la edición inline
const editingId = ref<string | null>(null)
const editingName = ref('')
const actionError = ref<string | null>(null)

onMounted(() => {
  void savedStore.loadForCurrentUser()
})

// Si la sesión cae, vuelve al login conservando el destino
watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (!authenticated) {
      void router.replace({
        name: 'login',
        query: { redirect: '/mis-paletas' },
      })
      return
    }

    void savedStore.loadForCurrentUser()
  },
)

function modeLabel(mode: HarmonyMode): string {
  return HARMONY_MODES.find((item) => item.id === mode)?.label ?? mode
}

function toneLabel(tone: PaletteTone): string {
  return PALETTE_TONES.find((item) => item.id === tone)?.label ?? tone
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value))
}

// Abrir restaura la paleta y entra al historial del generador
function openPalette(palette: SavedPalette): void {
  paletteStore.applySavedPalette(palette)
  void router.push('/generador')
}

function startRename(palette: SavedPalette): void {
  editingId.value = palette.id
  editingName.value = palette.name
  actionError.value = null
}

function cancelRename(): void {
  editingId.value = null
  editingName.value = ''
}

async function commitRename(): Promise<void> {
  if (!editingId.value) {
    return
  }

  await savedStore.rename(editingId.value, editingName.value)

  if (!error.value) {
    cancelRename()
  }
}

async function duplicatePalette(id: string): Promise<void> {
  actionError.value = null
  await savedStore.duplicate(id)

  if (savedStore.error) {
    actionError.value = savedStore.error
  }
}

async function removePalette(palette: SavedPalette): Promise<void> {
  const confirmed = window.confirm(`¿Eliminar “${palette.name}”?`)

  if (!confirmed) {
    return
  }

  actionError.value = null
  await savedStore.remove(palette.id)

  if (savedStore.error) {
    actionError.value = savedStore.error
  }
}
</script>

<template>
  <div class="saved-palettes">
    <header class="page-heading">
      <p class="page-heading__eyebrow">Mis paletas</p>
      <h1>Tus combinaciones guardadas.</h1>
      <p>Abre una paleta para seguir editándola, renómbrala, duplícala o elimínala.</p>
    </header>

    <p class="saved-palettes__storage">Guardadas en tu cuenta · {{ auth.userEmail }}</p>

    <p v-if="loading" class="saved-palettes__state">Cargando paletas…</p>

    <p v-else-if="error" class="saved-palettes__error" role="alert">
      {{ error }}
    </p>

    <p v-else-if="actionError" class="saved-palettes__error" role="alert">
      {{ actionError }}
    </p>

    <!-- Estado vacío con salida directa al generador -->
    <section
      v-else-if="palettes.length === 0"
      class="saved-palettes__empty"
      aria-labelledby="empty-title"
    >
      <h2 id="empty-title">Todavía no guardaste ninguna paleta.</h2>
      <p>Generá una paleta y guardala debajo de la sección de exportar.</p>
      <RouterLink class="saved-palettes__cta" to="/generador">Ir al generador</RouterLink>
    </section>

    <section v-else class="saved-palettes__grid" aria-label="Paletas guardadas">
      <article v-for="palette in palettes" :key="palette.id" class="saved-card">
        <!-- La vista previa es decorativa: el texto la reemplaza -->
        <div class="saved-card__preview" aria-hidden="true">
          <span
            v-for="(hex, index) in palette.swatches"
            :key="`${palette.id}-${index}`"
            :style="{ backgroundColor: hex }"
            :class="{ 'saved-card__swatch--base': index === 2 }"
          />
        </div>

        <div class="saved-card__body">
          <div v-if="editingId === palette.id" class="saved-card__rename">
            <label class="sr-only" :for="`rename-${palette.id}`">Nuevo nombre</label>
            <input
              :id="`rename-${palette.id}`"
              v-model="editingName"
              type="text"
              maxlength="80"
              autocomplete="off"
              @keydown.enter.prevent="commitRename"
              @keydown.esc.prevent="cancelRename"
            />
            <div class="saved-card__rename-actions">
              <AppButton type="button" variant="primary" @click="commitRename">
                Guardar
              </AppButton>
              <AppButton type="button" variant="ghost" @click="cancelRename">
                Cancelar
              </AppButton>
            </div>
          </div>

          <template v-else>
            <h2>{{ palette.name }}</h2>
            <p class="saved-card__meta">
              {{ modeLabel(palette.mode) }} · {{ toneLabel(palette.tone) }}
            </p>
            <p class="saved-card__date">{{ formatDate(palette.updatedAt) }}</p>
          </template>

          <div class="saved-card__actions">
            <AppButton variant="primary" @click="openPalette(palette)">Abrir</AppButton>
            <AppButton variant="ghost" @click="startRename(palette)">Renombrar</AppButton>
            <AppButton variant="ghost" @click="duplicatePalette(palette.id)">
              Duplicar
            </AppButton>
            <AppButton variant="ghost" @click="removePalette(palette)">Eliminar</AppButton>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
