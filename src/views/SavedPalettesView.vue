<script setup lang="ts">
// Listado de paletas guardadas: abrir, renombrar, duplicar y eliminar

// Pinia
import { storeToRefs } from 'pinia'
// Vue
import { onMounted, ref, watch } from 'vue'
// i18n
import { useI18n } from 'vue-i18n'
// Router
import { RouterLink, useRouter } from 'vue-router'
// Componentes
import AppButton from '@/components/ui/AppButton.vue'
// i18n
import { getLocale } from '@/i18n'
// Dominio
import type { HarmonyMode, PaletteTone } from '@/lib/palette'
import type { SavedPalette } from '@/lib/saved-palette'
// Stores
import { useAuthStore } from '@/stores/auth'
import { usePaletteStore } from '@/stores/palette'
import { useSavedPalettesStore } from '@/stores/saved-palettes'

const { t } = useI18n()
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
  return t(`modes.${mode}.label`)
}

function toneLabel(tone: PaletteTone): string {
  return t(`tones.${tone}.label`)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium' }).format(new Date(value))
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
  const confirmed = window.confirm(t('saved.confirmDelete', { name: palette.name }))

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
      <p class="page-heading__eyebrow">{{ t('saved.eyebrow') }}</p>
      <h1>{{ t('saved.title') }}</h1>
      <p>{{ t('saved.lead') }}</p>
    </header>

    <p class="saved-palettes__storage">
      {{ t('saved.storage') }} · {{ auth.userEmail }}
    </p>

    <p v-if="loading" class="saved-palettes__state">{{ t('saved.loading') }}</p>

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
      <h2 id="empty-title">{{ t('saved.emptyTitle') }}</h2>
      <p>{{ t('saved.emptyBody') }}</p>
      <RouterLink class="saved-palettes__cta" to="/generador">{{ t('saved.cta') }}</RouterLink>
    </section>

    <section v-else class="saved-palettes__grid" :aria-label="t('saved.gridAria')">
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
            <label class="sr-only" :for="`rename-${palette.id}`">{{ t('saved.newName') }}</label>
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
                {{ t('common.save') }}
              </AppButton>
              <AppButton type="button" variant="ghost" @click="cancelRename">
                {{ t('common.cancel') }}
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
            <AppButton variant="primary" @click="openPalette(palette)">
              {{ t('common.open') }}
            </AppButton>
            <AppButton variant="ghost" @click="startRename(palette)">
              {{ t('common.rename') }}
            </AppButton>
            <AppButton variant="ghost" @click="duplicatePalette(palette.id)">
              {{ t('common.duplicate') }}
            </AppButton>
            <AppButton variant="ghost" @click="removePalette(palette)">
              {{ t('common.delete') }}
            </AppButton>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
