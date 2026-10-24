<script setup lang="ts">
// Panel de interpretación en lenguaje natural

import { Sparkles } from '@lucide/vue'
import { computed, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { InterpretedPalette } from '@/lib/ai'
import { HARMONY_MODES, PALETTE_TONES } from '@/lib/palette'

const props = defineProps<{
  loading: boolean
  error: string | null
  result: InterpretedPalette | null
  examples: string[]
  lockedCount: number
}>()

const emit = defineEmits<{
  interpret: [prompt: string]
}>()

const prompt = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// Etiquetas legibles de la receta aplicada
const modeLabel = computed(
  () => HARMONY_MODES.find((mode) => mode.id === props.result?.mode)?.label ?? '',
)
const toneLabel = computed(
  () => PALETTE_TONES.find((tone) => tone.id === props.result?.tone)?.label ?? '',
)

function submit(): void {
  const value = prompt.value.trim()

  if (!value || props.loading) {
    return
  }

  emit('interpret', value)
}

// Los ejemplos solo rellenan el input; el usuario decide cuándo interpretar
function useExample(example: string): void {
  prompt.value = example
  inputRef.value?.focus()
}
</script>

<template>
  <section class="ai-prompt" aria-labelledby="ai-prompt-title">
    <div class="ai-prompt__heading">
      <p class="ai-prompt__eyebrow">IA</p>
      <h2 id="ai-prompt-title">Describe tu paleta.</h2>
      <p>
        Escribe una idea en lenguaje natural. La IA elige el color base, la armonía y el tono;
        los cinco colores los genera Palette Lab.
      </p>
    </div>

    <form class="ai-prompt__form" @submit.prevent="submit">
      <label class="sr-only" for="ai-prompt-input">Descripción de la paleta</label>
      <input
        id="ai-prompt-input"
        ref="inputRef"
        v-model="prompt"
        class="ai-prompt__input"
        type="text"
        maxlength="240"
        autocomplete="off"
        spellcheck="false"
        placeholder="Ej. atardecer en la playa"
        :disabled="loading"
      />
      <AppButton type="submit" variant="primary" :disabled="loading || !prompt.trim()">
        <Sparkles :size="16" aria-hidden="true" />
        {{ loading ? 'Interpretando…' : 'Interpretar' }}
      </AppButton>
    </form>

    <div class="ai-prompt__examples" aria-label="Ejemplos de descripciones">
      <button
        v-for="example in examples"
        :key="example"
        type="button"
        class="ai-prompt__example"
        :disabled="loading"
        @click="useExample(example)"
      >
        {{ example }}
      </button>
    </div>

    <p v-if="error" class="ai-prompt__error" role="alert">{{ error }}</p>
    <p v-else-if="result" class="ai-prompt__result" aria-live="polite">
      <span>{{ result.label ?? 'Interpretación lista' }}</span>
      <code>{{ result.base }}</code>
      <span>{{ modeLabel }} · {{ toneLabel }}</span>
      <span v-if="lockedCount > 0">Se conservaron {{ lockedCount }} bloqueados.</span>
    </p>
    <p v-else class="ai-prompt__hint">
      Elige un ejemplo o escribe tu idea y presiona Interpretar. La IA solo traduce la
      descripción a una receta válida.
    </p>
  </section>
</template>
