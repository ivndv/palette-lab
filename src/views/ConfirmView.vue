<script setup lang="ts">
// Confirmación de email: canjea el code y entra a las paletas

// Iconos
import { LoaderCircle, Palette, TriangleAlert } from '@lucide/vue'
// Vue
import { onMounted, ref } from 'vue'
// Router
import { RouterLink, useRouter } from 'vue-router'
// Componentes
import AuthLayout from '@/components/auth/AuthLayout.vue'
// Stores
import { useAuthStore } from '@/stores/auth'

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
    title="No pudimos confirmar la cuenta"
    subtitle="El enlace expiró o ya se usó. Podés pedir uno nuevo desde el ingreso."
  >
    <RouterLink class="auth-button auth-button--primary" to="/login">
      Volver a entrar
    </RouterLink>

    <template #footer>
      Si ya confirmaste antes, entrá con tu email y contraseña.
    </template>
  </AuthLayout>

  <AuthLayout
    v-else
    :icon="Palette"
    title="Confirmando tu cuenta"
    subtitle="Estamos validando el enlace."
  >
    <p class="auth-loading" role="status">
      <LoaderCircle :size="18" class="auth-spin" aria-hidden="true" />
      Un momento…
    </p>
  </AuthLayout>
</template>
