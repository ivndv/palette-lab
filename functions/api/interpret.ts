// Dominio compartido: la misma validación de recetas que usa el cliente, no una copia
import { parseInterpretedPalette } from '../../src/lib/ai'

// Variables del proyecto en Pages: se llenan desde el dashboard o .dev.vars, nunca desde el cliente
interface Env {
  PALETTE_LAB_API_URL?: string
  PALETTE_LAB_API_KEY?: string
}

// Contexto que Pages entrega a cada Function (solo la parte que usa este handler)
interface Context {
  request: Request
  env: Env
}

// Guarda mínima para leer JSON de fuera sin confiar en su forma
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Respuesta JSON del borde: no-store para que ni la CDN ni el navegador la guarden
function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  // 1. Valida la entrada antes de gastar una petición de IA
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return json({ error: 'El cuerpo debe ser JSON.' }, 400)
  }

  if (!isRecord(body) || typeof body.prompt !== 'string') {
    return json({ error: 'Falta la descripción de la paleta.' }, 400)
  }

  const prompt = body.prompt.trim()

  if (!prompt) {
    return json({ error: 'La descripción no puede estar vacía.' }, 400)
  }

  if (prompt.length > 240) {
    return json({ error: 'La descripción es demasiado larga.' }, 400)
  }

  // 2. Falla temprano si falta configuración: es un fallo nuestro (500), no de la IA
  if (!env.PALETTE_LAB_API_URL) {
    return json({ error: 'Falta configurar PALETTE_LAB_API_URL.' }, 500)
  }

  // 3. Llama al microservicio desde el servidor, nunca desde el navegador: la API key no viaja al cliente.
  //    El corte de 9 s da margen a la IA y queda por debajo del límite de la plataforma
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 9_000)
  // Pages expone la IP real en CF-Connecting-IP; se reenvía para el rate limit del API
  const clientIp = request.headers.get('CF-Connecting-IP')

  try {
    const response = await fetch(`${env.PALETTE_LAB_API_URL.replace(/\/+$/, '')}/interpret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.PALETTE_LAB_API_KEY ? { 'X-API-Key': env.PALETTE_LAB_API_KEY } : {}),
        ...(clientIp ? { 'X-Client-IP': clientIp } : {}),
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })

    const payload: unknown = await response.json().catch(() => null)

    // 4. El 429 se propaga con Retry-After para que el cliente sepa cuándo reintentar;
    //    cualquier otro fallo upstream se traduce a 502
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')

        return json(
          { error: 'La IA alcanzó su límite. Inténtalo más tarde.' },
          429,
          retryAfter ? { 'Retry-After': retryAfter } : undefined,
        )
      }

      return json({ error: 'El servicio de IA no respondió correctamente.' }, 502)
    }

    // 5. Normaliza con el validador del dominio (acepta hex corto, p. ej. #abc)
    const receta = parseInterpretedPalette(payload)

    if (!receta) {
      return json({ error: 'La IA devolvió una receta inválida.' }, 502)
    }

    return json(receta)
  } catch (error) {
    // 6. Aborto = 504 (tardó demasiado); cualquier otra excepción = 502 (no conectamos)
    const timeoutError = error instanceof Error && error.name === 'AbortError'

    return json(
      {
        error: timeoutError
          ? 'La IA tardó demasiado en responder.'
          : 'No pudimos conectar con el servicio de IA.',
      },
      timeoutError ? 504 : 502,
    )
  } finally {
    clearTimeout(timeout)
  }
}
