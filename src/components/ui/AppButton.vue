<script setup lang="ts">
// Botón base con variantes y estado pressed opcional

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    type?: 'button' | 'submit'
    disabled?: boolean
    pressed?: boolean
  }>(),
  {
    variant: 'secondary',
    type: 'button',
    disabled: false,
    pressed: undefined,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :aria-pressed="pressed"
    class="app-button"
    :class="`app-button--${variant}`"
  >
    <slot />
  </button>
</template>
