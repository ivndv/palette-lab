// Rutas de la app y compatibilidad con el login viejo

import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import ConfirmView from '@/views/ConfirmView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import GeneratorView from '@/views/GeneratorView.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'
import SavedPalettesView from '@/views/SavedPalettesView.vue'

// /login?mode=register de los links viejos redirige al registro
function legacyRegisterRoute(to: RouteLocationNormalized): true | RouteLocationRaw {
  if (to.query.mode !== 'register') {
    return true
  }

  return {
    name: 'register',
    query: to.query.redirect ? { redirect: to.query.redirect } : {},
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/generador',
      name: 'generator',
      component: GeneratorView,
    },
    {
      path: '/mis-paletas',
      name: 'saved-palettes',
      component: SavedPalettesView,
      // El guard de main.ts exige sesión
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      beforeEnter: legacyRegisterRoute,
    },
    {
      path: '/registro',
      name: 'register',
      component: RegisterView,
    },
    {
      path: '/recuperar',
      name: 'forgot-password',
      component: ForgotPasswordView,
    },
    {
      path: '/restablecer',
      name: 'reset-password',
      component: ResetPasswordView,
    },
    {
      path: '/confirmar',
      name: 'confirm',
      component: ConfirmView,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    return { top: 0 }
  },
})
