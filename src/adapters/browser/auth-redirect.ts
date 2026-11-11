// Redirect absoluto sobre el origen actual del navegador

export function authRedirect(path: string): string {
  return `${window.location.origin}${path}`
}
