<script setup lang="ts">
// Landing con los pasos del generador

import { ArrowRight } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()

const pasos = computed(() => [
  { numero: '01', texto: t('home.step1') },
  { numero: '02', texto: t('home.step2') },
  { numero: '03', texto: t('home.step3') },
])
</script>

<template>
  <div class="home">
    <section class="hero" aria-labelledby="hero-title">
      <p class="hero__eyebrow">{{ t('home.eyebrow') }}</p>

      <h1 id="hero-title">
        {{ t('home.title') }}
        <span class="hero__accent">{{ t('home.titleAccent') }}</span>.
      </h1>

      <p class="hero__lead">{{ t('home.lead') }}</p>

      <!-- Pasos numerados como lista ordenada real para lectores de pantalla -->
      <ol class="hero__steps" :aria-label="t('home.stepsAria')">
        <li v-for="paso in pasos" :key="paso.numero">
          <span>{{ paso.numero }}</span>
          {{ paso.texto }}
        </li>
      </ol>

      <div class="hero__actions">
        <RouterLink class="app-button app-button--primary" to="/generador">
          {{ t('home.cta') }}
          <ArrowRight :size="16" aria-hidden="true" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>
