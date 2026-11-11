// Configuración de i18n y persistencia del idioma

import { createI18n } from 'vue-i18n'
import en from './messages/en'
import es from './messages/es'

export const LOCALES = ['es', 'en'] as const
export type AppLocale = (typeof LOCALES)[number]

const STORAGE_KEY = 'palette-lab:locale'

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

// El idioma guardado manda; el español es el base
function initialLocale(): AppLocale {
  if (typeof window === 'undefined') {
    return 'es'
  }

  const stored = localStorage.getItem(STORAGE_KEY)

  return isAppLocale(stored) ? stored : 'es'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'es',
  messages: { es, en },
})

export function getLocale(): AppLocale {
  return i18n.global.locale.value as AppLocale
}

export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale

  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
  }
}
