// Traducción de errores de Supabase Auth a mensajes de la UI

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

// Devuelve el mensaje en español para un error de auth
export function authErrorMessage(error: unknown): string {
  const { code, message } = fields(error)

  if (!code && !message) {
    return 'No pudimos completar la autenticación.'
  }

  // Credenciales
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Email o contraseña incorrectos.'
  }

  if (needsEmailConfirmation(error)) {
    return 'Tenés que confirmar tu email antes de entrar.'
  }

  if (code === 'user_already_exists' || /already registered/i.test(message)) {
    return 'Ya existe una cuenta con ese email.'
  }

  // Contraseñas
  if (
    code === 'weak_password' ||
    /password should be at least|password is too weak/i.test(message)
  ) {
    return 'La contraseña es demasiado débil.'
  }

  if (code === 'same_password' || /different from the old password/i.test(message)) {
    return 'La contraseña nueva tiene que ser distinta a la anterior.'
  }

  // Límites y seguridad
  if (code === 'over_email_send_rate_limit' || /email rate limit/i.test(message)) {
    return 'Mandamos demasiados emails. Probá de nuevo en unos minutos.'
  }

  if (/rate limit/i.test(message)) {
    return 'Demasiados intentos. Esperá un momento.'
  }

  if (code === 'captcha_failed' || /captcha/i.test(message)) {
    return 'La verificación de seguridad falló. Intentá de nuevo.'
  }

  if (code === 'provider_disabled' || /provider is not enabled/i.test(message)) {
    return 'Ese método de acceso no está habilitado en este entorno.'
  }

  // Entorno
  if (/supabase no está configurado/i.test(message)) {
    return 'Supabase no está configurado en este entorno.'
  }

  return 'No pudimos completar la autenticación.'
}
