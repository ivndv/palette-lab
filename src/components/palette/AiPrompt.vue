<script setup lang="ts">
// Panel de interpretación en lenguaje natural

import { Sparkles } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import type { InterpretedPalette } from '@/lib/ai'

const { t } = useI18n()

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
const modeLabel = computed(() => (props.result ? t(`modes.${props.result.mode}.label`) : ''))
const toneLabel = computed(() => (props.result ? t(`tones.${props.result.tone}.label`) : ''))

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
      <p class="ai-prompt__eyebrow">{{ t('ai.eyebrow') }}</p>
      <h2 id="ai-prompt-title">{{ t('ai.title') }}</h2>
      <p>{{ t('ai.lead') }}</p>
    </div>

    <form class="ai-prompt__form" @submit.prevent="submit">
      <label class="sr-only" for="ai-prompt-input">{{ t('ai.inputLabel') }}</label>
      <input
        id="ai-prompt-input"
        ref="inputRef"
        v-model="prompt"
        class="ai-prompt__input"
        type="text"
        maxlength="240"
        autocomplete="off"
        spellcheck="false"
        :placeholder="t('ai.placeholder')"
        :disabled="loading"
      />
      <AppButton type="submit" variant="primary" :disabled="loading || !prompt.trim()">
        <Sparkles :size="16" aria-hidden="true" />
        {{ loading ? t('ai.interpreting') : t('ai.interpret') }}
      </AppButton>
    </form>

    <div class="ai-prompt__examples" :aria-label="t('ai.examplesAria')">
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
      <span>{{ result.label ?? t('ai.resultReady') }}</span>
      <code>{{ result.base }}</code>
      <span>{{ modeLabel }} · {{ toneLabel }}</span>
      <span v-if="lockedCount > 0">{{ t('ai.keptLocked', { count: lockedCount }) }}</span>
    </p>
    <p v-else class="ai-prompt__hint">{{ t('ai.hint') }}</p>
  </section>
</template>
