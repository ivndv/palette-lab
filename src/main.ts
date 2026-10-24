// Arranque de Vue, Pinia y el guard de rutas

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import './styles/main.scss'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'

const pinia = createPinia()
const auth = useAuthStore(pinia)

// Las rutas privadas esperan la sesión antes de decidir
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) {
    return true
  }

  await auth.initialize()

  if (!auth.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  return true
})

createApp(App).use(pinia).use(router).mount('#app')
