// Carga del script de Turnstile y tipos del API

// Opciones que acepta el render explícito
export interface TurnstileOptions {
  sitekey: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'flexible'
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

// Subconjunto del API que usa la app
export interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile'
export const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Site key pública inyectada en el build
export function getTurnstileSiteKey(): string {
  return import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''
}

// Sin site key el widget no se renderiza y el submit no exige token
export function isTurnstileEnabled(): boolean {
  return getTurnstileSiteKey().length > 0
}

// Una sola carga por pestaña, compartida entre montajes
let pending: Promise<TurnstileApi> | null = null

// Carga el script una vez y resuelve con el API listo
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Turnstile necesita un navegador.'))
  }

  // Si otra vista ya lo cargó, se reutiliza
  if (window.turnstile) {
    return Promise.resolve(window.turnstile)
  }

  if (pending) {
    return pending
  }

  pending = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')

    function fail(): void {
      // Limpia el cache para permitir un reintento
      pending = null
      script.remove()
      reject(new Error('No pudimos cargar Turnstile.'))
    }

    script.id = TURNSTILE_SCRIPT_ID
    script.src = TURNSTILE_SCRIPT_SRC
    script.async = true
    script.defer = true

    script.addEventListener('load', () => {
      if (window.turnstile) {
        resolve(window.turnstile)
        return
      }

      fail()
    })
    script.addEventListener('error', fail)

    // Un CSP o un sandbox puede bloquear el append
    try {
      document.head.append(script)
    } catch {
      fail()
    }
  })

  return pending
}
