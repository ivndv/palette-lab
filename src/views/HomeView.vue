<script setup lang="ts">
// Landing con los pasos del generador

import { ArrowRight } from '@lucide/vue'
import { RouterLink } from 'vue-router'

const pasos = [
  { numero: '01', texto: 'Elige un color' },
  { numero: '02', texto: 'Explora la armonía' },
  { numero: '03', texto: 'Exporta' },
]
</script>

<template>
  <div class="home">
    <section class="hero" aria-labelledby="hero-title">
      <p class="hero__eyebrow">Generador de paletas</p>

      <h1 id="hero-title">
        Paletas que se sienten <span class="hero__accent">tuyas</span>.
      </h1>

      <p class="hero__lead">
        Elige un color base, explora armonías y bloquea los colores que quieras conservar.
        Cuando la paleta te guste, expórtala en CSS o JSON.
      </p>

      <!-- Pasos numerados como lista ordenada real para lectores de pantalla -->
      <ol class="hero__steps" aria-label="Pasos para crear una paleta">
        <li v-for="paso in pasos" :key="paso.numero">
          <span>{{ paso.numero }}</span>
          {{ paso.texto }}
        </li>
      </ol>

      <div class="hero__actions">
        <RouterLink class="app-button app-button--primary" to="/generador">
          Abrir el generador
          <ArrowRight :size="16" aria-hidden="true" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>
