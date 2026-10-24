<script setup lang="ts">
// Estructura compartida de las pantallas de auth

import type { Component } from 'vue'

defineProps<{
  title: string
  subtitle?: string
  icon: Component
}>()
</script>

<template>
  <div class="auth-view">
    <section class="auth-panel" :aria-label="title">
      <header class="auth-panel__header">
        <span class="auth-panel__icon">
          <component :is="icon" :size="22" aria-hidden="true" />
        </span>

        <h1>{{ title }}</h1>

        <!-- El slot permite intercalar links en el subtítulo -->
        <p v-if="subtitle || $slots.subtitle" class="auth-panel__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </header>

      <div class="auth-panel__body">
        <slot />
      </div>

      <p v-if="$slots.footer" class="auth-panel__footnote">
        <slot name="footer" />
      </p>
    </section>
  </div>
</template>
