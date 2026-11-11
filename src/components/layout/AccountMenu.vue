<script setup lang="ts">
// Menú de cuenta: sesión, idioma y tema

// Iconos
import { CircleUserRound, Globe, LayoutGrid, LogIn, LogOut, Monitor, Moon, Sun } from '@lucide/vue'
// Vue
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
// i18n
import { useI18n } from 'vue-i18n'
// Router
import { RouterLink, useRouter } from 'vue-router'
// i18n
import { type AppLocale, getLocale, setLocale } from '@/i18n'
// Stores
import { useAuthStore } from '@/stores/auth'
import { type ThemePreference, useThemeStore } from '@/stores/theme'

const { t } = useI18n()
const auth = useAuthStore()
const themeStore = useThemeStore()
const router = useRouter()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)

const activeLocale = computed(() => getLocale())

const languages = [
  { value: 'es', label: 'ES' },
  { value: 'en', label: 'EN' },
] as const satisfies readonly { value: AppLocale; label: string }[]

const themes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const satisfies readonly { value: ThemePreference; icon: unknown }[]

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

function changeLocale(value: AppLocale): void {
  setLocale(value)
}

function changeTheme(value: ThemePreference): void {
  themeStore.setTheme(value)
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
    <button
      ref="trigger"
      type="button"
      class="account-menu__trigger"
      :class="{ 'account-menu__trigger--guest': !auth.isAuthenticated }"
      :aria-expanded="open"
      aria-controls="account-menu-panel"
      :aria-label="
        auth.isAuthenticated
          ? t('account.accountAria', { email: auth.userEmail })
          : t('account.menuAria')
      "
      @click="toggle"
    >
      <span v-if="auth.isAuthenticated" class="account-menu__avatar">
        {{ auth.userInitial }}
      </span>
      <CircleUserRound v-else :size="19" aria-hidden="true" />
    </button>

    <div v-if="open" id="account-menu-panel" class="account-menu__panel">
      <!-- Cuenta -->
      <div v-if="auth.isAuthenticated" class="account-menu__account">
        <span class="account-menu__avatar account-menu__avatar--panel">
          {{ auth.userInitial }}
        </span>
        <div class="account-menu__identity">
          <p class="account-menu__email">{{ auth.userEmail }}</p>
          <p class="account-menu__role">{{ t('account.account') }}</p>
        </div>
      </div>

      <!-- Preferencias -->
      <section class="account-menu__section" :aria-label="t('account.preferences')">
        <p class="account-menu__section-title">{{ t('account.preferences') }}</p>

        <div class="account-menu__row">
          <span class="account-menu__row-label">
            <Globe :size="14" aria-hidden="true" />
            {{ t('account.language') }}
          </span>

          <div class="account-menu__chips" role="radiogroup" :aria-label="t('account.language')">
            <label
              v-for="item in languages"
              :key="item.value"
              class="account-menu__chip"
              :class="{ 'account-menu__chip--active': activeLocale === item.value }"
            >
              <input
                class="sr-only"
                type="radio"
                name="account-locale"
                :value="item.value"
                :checked="activeLocale === item.value"
                @change="changeLocale(item.value)"
              />
              {{ item.label }}
            </label>
          </div>
        </div>

        <div class="account-menu__row">
          <span class="account-menu__row-label">
            <Sun :size="14" aria-hidden="true" />
            {{ t('account.theme') }}
          </span>

          <div class="account-menu__chips" role="radiogroup" :aria-label="t('account.theme')">
            <label
              v-for="item in themes"
              :key="item.value"
              class="account-menu__chip account-menu__chip--icon"
              :class="{ 'account-menu__chip--active': themeStore.theme === item.value }"
              :title="t(`theme.${item.value}`)"
            >
              <input
                class="sr-only"
                type="radio"
                name="account-theme"
                :value="item.value"
                :checked="themeStore.theme === item.value"
                :aria-label="t(`theme.${item.value}`)"
                @change="changeTheme(item.value)"
              />
              <component :is="item.icon" :size="14" aria-hidden="true" />
            </label>
          </div>
        </div>
      </section>

      <!-- Sesión -->
      <div class="account-menu__section account-menu__section--session">
        <template v-if="auth.isAuthenticated">
          <RouterLink to="/mis-paletas" @click="close">
            <LayoutGrid :size="14" aria-hidden="true" />
            {{ t('account.saved') }}
          </RouterLink>
          <button type="button" @click="logout">
            <LogOut :size="14" aria-hidden="true" />
            {{ t('account.logout') }}
          </button>
        </template>

        <RouterLink v-else to="/login" @click="close">
          <LogIn :size="14" aria-hidden="true" />
          {{ t('account.login') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
