// Traducción de errores de Supabase Auth a claves de la UI

// Claves del catálogo para cada error de auth
export type AuthErrorKey =
  | 'auth.errors.generic'
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.emailNotConfirmed'
  | 'auth.errors.userExists'
  | 'auth.errors.weakPassword'
  | 'auth.errors.samePassword'
  | 'auth.errors.emailRateLimit'
  | 'auth.errors.rateLimit'
  | 'auth.errors.captcha'
  | 'auth.errors.providerDisabled'
  | 'auth.errors.notConfigured'

// Mensajes en español; los tests los usan y sirven de respaldo
const MENSAJES: Record<AuthErrorKey, string> = {
  'auth.errors.generic': 'No pudimos completar la autenticación.',
  'auth.errors.invalidCredentials': 'Email o contraseña incorrectos.',
  'auth.errors.emailNotConfirmed': 'Tenés que confirmar tu email antes de entrar.',
  'auth.errors.userExists': 'Ya existe una cuenta con ese email.',
  'auth.errors.weakPassword': 'La contraseña es demasiado débil.',
  'auth.errors.samePassword': 'La contraseña nueva tiene que ser distinta a la anterior.',
  'auth.errors.emailRateLimit': 'Mandamos demasiados emails. Probá de nuevo en unos minutos.',
  'auth.errors.rateLimit': 'Demasiados intentos. Esperá un momento.',
  'auth.errors.captcha': 'La verificación de seguridad falló. Intentá de nuevo.',
  'auth.errors.providerDisabled': 'Ese método de acceso no está habilitado en este entorno.',
  'auth.errors.notConfigured': 'Supabase no está configurado en este entorno.',
}

// Extrae código y mensaje sin asumir la forma del error
function fields(error: unknown): { code: string; message: string } {
  if (typeof error !== 'object' || error === null) {
    return { code: '', message: '' }
  }

  const record = error as Record<string, unknown>

  return {
    code: typeof record.code === 'string' ? record.code : '',
    message: typeof record.message === 'string' ? record.message : '',
  }
}

// Detecta si el login falló porque falta confirmar el email
export function needsEmailConfirmation(error: unknown): boolean {
  const { code, message } = fields(error)

  return code === 'email_not_confirmed' || /email not confirmed/i.test(message)
}

// Devuelve la clave de traducción para un error de auth
export function authErrorKey(error: unknown): AuthErrorKey {
  const { code, message } = fields(error)

  if (!code && !message) {
    return 'auth.errors.generic'
  }

  // Credenciales
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'auth.errors.invalidCredentials'
  }

  if (needsEmailConfirmation(error)) {
    return 'auth.errors.emailNotConfirmed'
  }

  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'auth.errors.userExists'
  }

  // Contraseñas
  if (
    code === 'weak_password' ||
    /password should be at least|password is too weak/i.test(message)
  ) {
    return 'auth.errors.weakPassword'
  }

  if (code === 'same_password' || /different from the old password/i.test(message)) {
    return 'auth.errors.samePassword'
  }

  // Límites y seguridad
  if (code === 'over_email_send_rate_limit' || /email rate limit/i.test(message)) {
    return 'auth.errors.emailRateLimit'
  }

  if (/rate limit/i.test(message)) {
    return 'auth.errors.rateLimit'
  }

  if (code === 'captcha_failed' || /captcha/i.test(message)) {
    return 'auth.errors.captcha'
  }

  if (code === 'provider_disabled' || /provider is not enabled/i.test(message)) {
    return 'auth.errors.providerDisabled'
  }

  // Entorno
  if (/supabase no está configurado/i.test(message)) {
    return 'auth.errors.notConfigured'
  }

  return 'auth.errors.generic'
}

// Mensaje en español para tests y respaldos
export function authErrorMessage(error: unknown): string {
  return MENSAJES[authErrorKey(error)]
}
