export async function normalizeMenuImage(file: File): Promise<Blob> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('Selecione uma imagem PNG, JPG ou WebP com até 5 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error('A imagem é muito grande. Use até 40 megapixels.')
    const canvas = document.createElement('canvas')
    canvas.width = 1600; canvas.height = 1000
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.')
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height)
    const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height)
    const width = bitmap.width * scale; const height = bitmap.height * scale
    context.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob || blob.size > 5 * 1024 * 1024) reject(new Error('Não foi possível gerar um PNG com até 5 MB.'))
      else resolve(blob)
    }, 'image/png'))
  } finally { bitmap.close() }
}
