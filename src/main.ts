// Arranque de Vue, Pinia, i18n y el guard de rutas

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import './styles/main.scss'
import App from './App.vue'
import { getLocale, i18n } from './i18n'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'

const pinia = createPinia()
const auth = useAuthStore(pinia)
const theme = useThemeStore(pinia)

// Sincroniza el idioma y el tema guardados antes de montar
document.documentElement.lang = getLocale()
theme.apply()

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

createApp(App).use(pinia).use(router).use(i18n).mount('#app')
