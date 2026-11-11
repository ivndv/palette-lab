// Pruebas de la descarga en navegador

import { afterEach, describe, expect, it, vi } from 'vitest'
import { download } from './download'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('download', () => {
  it('no falla si no hay createObjectURL', () => {
    vi.stubGlobal('URL', { createObjectURL: undefined })

    expect(() => download('x.txt', 'hola', 'text/plain')).not.toThrow()
  })

  it('crea y revoca el blob al descargar', () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    download('palette.css', 'body {}', 'text/css')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')

    click.mockRestore()
  })
})
