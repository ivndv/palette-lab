// Preferencia de tema con persistencia local

import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'palette-lab:theme'
const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && PREFERENCES.includes(value as ThemePreference)
}

function initialTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const stored = localStorage.getItem(STORAGE_KEY)

  return isThemePreference(stored) ? stored : 'system'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemePreference>(initialTheme())

  // `system` quita el atributo y deja actuar a prefers-color-scheme
  function apply(): void {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement

    if (theme.value === 'system') {
      root.removeAttribute('data-theme')
      return
    }

    root.setAttribute('data-theme', theme.value)
  }

  function setTheme(value: ThemePreference): void {
    if (!isThemePreference(value)) {
      return
    }

    theme.value = value

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, value)
    }

    apply()
  }

  return { theme, apply, setTheme }
})
