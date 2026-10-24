import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './interpret'

// Fixture: petición entrante como la que arma el navegador
function request(body: unknown): Request {
  return new Request('https://palette-lab.test/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

// Fixture: respuesta simulada del microservicio de IA
function upstream(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

// Entorno mínimo para ejercitar el camino feliz
const env = {
  PALETTE_LAB_API_URL: 'https://api.palette-lab.test',
  PALETTE_LAB_API_KEY: 'secret',
}

// Cada test reemplaza fetch; se restaura para que no se filtren stubs entre casos
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('onRequestPost', () => {
  it('devuelve una receta normalizada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        upstream({
          base: '#B45309',
          mode: 'analogous',
          tone: 'muted',
          label: 'café cálido',
        }),
      ),
    )

    const response = await onRequestPost({ request: request({ prompt: 'café' }), env })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      base: '#b45309',
      mode: 'analogous',
      tone: 'muted',
      label: 'café cálido',
    })
  })

  it('normaliza hex corto igual que el dominio', async () => {
    // Regresión: normalizeHex acepta #abc y lo expande, así que el borde debe aceptarlo igual
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(upstream({ base: '#ABC', mode: 'triadic', tone: 'vivid' })),
    )

    const response = await onRequestPost({ request: request({ prompt: 'café' }), env })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      base: '#aabbcc',
      mode: 'triadic',
      tone: 'vivid',
    })
  })

  it('rechaza JSON inválido, prompt vacío y prompt largo', async () => {
    expect((await onRequestPost({ request: request('{'), env })).status).toBe(400)
    expect((await onRequestPost({ request: request({ prompt: '   ' }), env })).status).toBe(400)
    expect(
      (await onRequestPost({ request: request({ prompt: 'x'.repeat(241) }), env })).status,
    ).toBe(400)
  })

  it('propaga 429 y conserva Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(upstream({ error: 'límite' }, 429, { 'Retry-After': '30' })),
    )

    const response = await onRequestPost({ request: request({ prompt: 'café' }), env })

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('30')
  })

  it('traduce errores upstream y recetas inválidas a 502', async () => {
    // Caso 1: el upstream falla con un cuerpo de error cualquiera
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(upstream({ detail: 'boom' }, 502)))

    expect((await onRequestPost({ request: request({ prompt: 'café' }), env })).status).toBe(502)

    // Caso 2: el upstream responde 200 pero la receta no pasa el dominio
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(upstream({ base: 'nope', mode: 'analogous', tone: 'muted' })),
    )

    expect((await onRequestPost({ request: request({ prompt: 'café' }), env })).status).toBe(502)
  })

  it('devuelve 504 si el fetch se aborta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('abort'), { name: 'AbortError' })),
    )

    expect((await onRequestPost({ request: request({ prompt: 'café' }), env })).status).toBe(504)
  })

  it('devuelve 500 si falta la URL de la API', async () => {
    const response = await onRequestPost({
      request: request({ prompt: 'café' }),
      env: {},
    })

    expect(response.status).toBe(500)
  })
})
