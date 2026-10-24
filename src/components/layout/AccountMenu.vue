<script setup lang="ts">
// Menú de cuenta: acceso, sesión y cierre

// Iconos
import { LogOut, User } from '@lucide/vue'
// Vue
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
// Router
import { RouterLink, useRouter } from 'vue-router'
// Stores
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

function toggle(): void {
  open.value = !open.value
}

function close(): void {
  open.value = false
}

// Devuelve el foco al botón al cerrar con Escape
async function closeWithFocus(): Promise<void> {
  close()
  await nextTick()
  trigger.value?.focus()
}

// Cierra al hacer click fuera del menú
function onDocumentClick(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) {
    close()
  }
}

async function logout(): Promise<void> {
  await auth.signOut()
  close()
  await router.push('/')
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="root" class="account-menu" @keydown.esc.prevent="closeWithFocus">
    <RouterLink v-if="!auth.isAuthenticated" class="account-menu__login" to="/login">
      <User :size="15" aria-hidden="true" />
      <span>Entrar</span>
    </RouterLink>

    <template v-else>
      <!-- Trigger con el inicial del email -->
      <button
        ref="trigger"
        type="button"
        class="account-menu__trigger"
        :aria-expanded="open"
        aria-controls="account-menu-panel"
        :aria-label="`Cuenta de ${auth.userEmail}`"
        @click="toggle"
      >
        <span class="account-menu__avatar">{{ auth.userInitial }}</span>
      </button>

      <div v-if="open" id="account-menu-panel" class="account-menu__panel">
        <p class="account-menu__email">{{ auth.userEmail }}</p>
        <RouterLink to="/mis-paletas" @click="close">Mis paletas</RouterLink>
        <button type="button" @click="logout">
          <LogOut :size="15" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </template>
  </div>
</template>
