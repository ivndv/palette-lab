<script setup lang="ts">
// Header mínimo: marca y menú de cuenta

import { RouterLink } from 'vue-router'
import AccountMenu from '@/components/layout/AccountMenu.vue'
</script>

<template>
  <RouterLink class="brand" to="/" aria-label="Palette Lab, inicio">
    <img class="brand__icon" src="/favicon.svg" alt="" width="32" height="32" />
    <span class="brand__name">palette lab</span>
  </RouterLink>

  <nav class="header-nav" aria-label="Navegación principal">
    <RouterLink to="/">Inicio</RouterLink>
    <RouterLink to="/generador">Generador</RouterLink>
    <RouterLink to="/mis-paletas">Mis paletas</RouterLink>
  </nav>

  <AccountMenu />
</template>
