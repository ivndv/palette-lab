<script setup lang="ts">
// Widget de Cloudflare Turnstile con render explícito

import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  getTurnstileSiteKey,
  isTurnstileEnabled,
  loadTurnstile,
  type TurnstileApi,
} from '@/lib/turnstile'

const emit = defineEmits<{
  token: [value: string]
}>()

const container = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const enabled = isTurnstileEnabled()
const dev = import.meta.env.DEV
const siteKey = getTurnstileSiteKey()

let api: TurnstileApi | null = null
let widgetId: string | null = null
let disposed = false

function clearToken(): void {
  emit('token', '')
}

onMounted(async () => {
  if (!enabled) {
    return
  }

  try {
    api = await loadTurnstile()

    // El componente pudo desmontarse mientras cargaba el script
    if (disposed || !container.value) {
      return
    }

    widgetId = api.render(container.value, {
      sitekey: siteKey,
      theme: 'auto',
      size: 'flexible',
      callback: (value) => emit('token', value),
      'expired-callback': clearToken,
      'error-callback': () => {
        clearToken()
        status.value = 'error'
      },
    })
    status.value = 'ready'
  } catch {
    status.value = 'error'
    clearToken()
  }
})

onBeforeUnmount(() => {
  disposed = true

  if (api && widgetId) {
    api.remove(widgetId)
  }

  widgetId = null
})

// El token es de un solo uso: se reinicia después de cada intento
function reset(): void {
  clearToken()

  if (api && widgetId) {
    api.reset(widgetId)
  }
}

defineExpose({ reset })
</script>

<template>
  <div v-if="enabled" class="turnstile">
    <div ref="container" class="turnstile__widget" />
    <p v-if="status === 'error'" class="turnstile__hint" role="status">
      No pudimos cargar la verificación. Recargá la página.
    </p>
  </div>
  <p v-else-if="dev" class="turnstile__hint" role="status">
    Falta configurar VITE_TURNSTILE_SITE_KEY.
  </p>
</template>
