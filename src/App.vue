<script setup lang="ts">
// Layout raíz: sesión inicial y shell compartido

import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppFooter from '@/components/layout/AppFooter.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppShell from '@/components/ui/AppShell.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

onMounted(() => {
  void auth.initialize()
})
</script>

<template>
  <AppShell>
    <template #header>
      <AppHeader />
    </template>

    <RouterView />

    <template #footer>
      <AppFooter />
    </template>
  </AppShell>
</template>
