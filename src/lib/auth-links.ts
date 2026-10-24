// Redirects internos seguros para los flujos de auth

const DEFAULT_REDIRECT = '/mis-paletas'

// Solo acepta rutas internas: evita //evil.test y URLs absolutas
export function isSafeRedirect(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
}

// Devuelve el redirect pedido o el fallback si no es seguro
export function resolveRedirect(value: unknown, fallback = DEFAULT_REDIRECT): string {
  return isSafeRedirect(value) ? value : fallback
}

// Convierte una ruta en URL absoluta sobre el origen actual
export function authRedirect(path: string): string {
  return `${window.location.origin}${path}`
}
