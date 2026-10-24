// Pruebas de la carga perezosa del script de Turnstile

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = {
  render: vi.fn(() => 'widget-1'),
  reset: vi.fn(),
  remove: vi.fn(),
}

let appended: HTMLScriptElement[] = []

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
  delete window.turnstile
  appended = []

  vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
    for (const node of nodes) {
      if (node instanceof HTMLScriptElement) {
        appended.push(node)
      }
    }
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete window.turnstile
})

describe('turnstile', () => {
  it('lee la site key del entorno', async () => {
    const { getTurnstileSiteKey, isTurnstileEnabled } = await import('./turnstile')

    expect(getTurnstileSiteKey()).toBe('site-key')
    expect(isTurnstileEnabled()).toBe(true)

    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')

    expect(isTurnstileEnabled()).toBe(false)
  })

  it('devuelve el api si el script ya estaba cargado', async () => {
    window.turnstile = api
    const { loadTurnstile } = await import('./turnstile')

    await expect(loadTurnstile()).resolves.toBe(api)
    expect(appended).toHaveLength(0)
  })

  it('carga el script una sola vez y resuelve al terminar', async () => {
    const { loadTurnstile } = await import('./turnstile')

    const first = loadTurnstile()
    const second = loadTurnstile()

    expect(appended).toHaveLength(1)
    expect(appended[0].id).toBe('cloudflare-turnstile')
    expect(appended[0].getAttribute('src')).toContain('render=explicit')

    window.turnstile = api
    appended[0].dispatchEvent(new Event('load'))

    await expect(first).resolves.toBe(api)
    await expect(second).resolves.toBe(api)
  })

  it('rechaza y permite reintentar si falla la carga', async () => {
    const { loadTurnstile } = await import('./turnstile')

    const promise = loadTurnstile()
    const expectation = expect(promise).rejects.toThrow('No pudimos cargar')

    appended[0].dispatchEvent(new Event('error'))

    await expectation
    expect(appended).toHaveLength(1)

    const retry = loadTurnstile()
    const retryExpectation = expect(retry).rejects.toThrow('No pudimos cargar')

    expect(appended).toHaveLength(2)
    appended[1].dispatchEvent(new Event('error'))
    await retryExpectation
  })

  it('rechaza si el script carga sin exponer la api', async () => {
    const { loadTurnstile } = await import('./turnstile')

    const promise = loadTurnstile()
    const expectation = expect(promise).rejects.toThrow('No pudimos cargar')

    appended[0].dispatchEvent(new Event('load'))

    await expectation
  })

  it('rechaza fuera del navegador', async () => {
    vi.stubGlobal('window', undefined)
    const { loadTurnstile } = await import('./turnstile')

    await expect(loadTurnstile()).rejects.toThrow('navegador')
  })
})
