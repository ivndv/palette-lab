// Descarga de archivos en el navegador

export function download(filename: string, content: string, mime: string): void {
  if (typeof URL.createObjectURL !== 'function') {
    return
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
