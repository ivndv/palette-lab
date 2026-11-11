<script setup lang="ts">
// Header mínimo: marca, navegación y menú de cuenta

import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import AccountMenu from '@/components/layout/AccountMenu.vue'

const { t } = useI18n()
</script>

<template>
  <RouterLink class="brand" to="/" :aria-label="t('header.brandAria')">
    <img class="brand__icon" src="/favicon.svg" alt="" width="32" height="32" />
    <span class="brand__name">palette lab</span>
  </RouterLink>

  <nav class="header-nav" :aria-label="t('header.navAria')">
    <RouterLink to="/">{{ t('header.home') }}</RouterLink>
    <RouterLink to="/generador">{{ t('header.generator') }}</RouterLink>
    <RouterLink to="/mis-paletas">{{ t('header.saved') }}</RouterLink>
  </nav>

  <AccountMenu />
</template>
