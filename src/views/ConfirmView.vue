<script setup lang="ts">
// Confirmación de email: canjea el code y entra a las paletas

// Iconos
import { LoaderCircle, Palette, TriangleAlert } from '@lucide/vue'
// Vue
import { onMounted, ref } from 'vue'
// i18n
import { useI18n } from 'vue-i18n'
// Router
import { RouterLink, useRouter } from 'vue-router'
// Componentes
import AuthLayout from '@/components/auth/AuthLayout.vue'
// Stores
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const failed = ref(false)

// Supabase canjea el code al inicializar; acá solo se espera el resultado
onMounted(async () => {
  await auth.initialize()

  if (auth.isAuthenticated) {
    await router.replace('/mis-paletas')
    return
  }

  failed.value = true
})
</script>

<template>
  <AuthLayout
    v-if="failed"
    :icon="TriangleAlert"
    :title="t('auth.confirm.failedTitle')"
    :subtitle="t('auth.confirm.failedSubtitle')"
  >
    <RouterLink class="auth-button auth-button--primary" to="/login">
      {{ t('auth.confirm.back') }}
    </RouterLink>

    <template #footer>
      {{ t('auth.confirm.failedFooter') }}
    </template>
  </AuthLayout>

  <AuthLayout
    v-else
    :icon="Palette"
    :title="t('auth.confirm.loadingTitle')"
    :subtitle="t('auth.confirm.loadingSubtitle')"
  >
    <p class="auth-loading" role="status">
      <LoaderCircle :size="18" class="auth-spin" aria-hidden="true" />
      {{ t('auth.confirm.loading') }}
    </p>
  </AuthLayout>
</template>
