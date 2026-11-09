/** Redimensiona e recorta (cover) a foto para 4:5, devolvendo um data URL JPEG leve para salvar no navegador. */
export function resizeImage(file: File, width = 240, height = 300, focusY = 0.25): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Selecione um arquivo de imagem.'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Não foi possível processar a imagem.'))
      const scale = Math.max(width / img.width, height / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (width - w) / 2, (height - h) * focusY, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Imagem inválida.'))
    }
    img.src = url
  })
}
