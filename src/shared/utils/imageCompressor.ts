/**
 * Utilidad ligera para compresión y optimización de imágenes en el cliente
 * Reduce el tamaño de fotos de cámaras móviles (5-15 MB -> 100-300 KB) sin perder legibilidad.
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<File> {
  // Si no es imagen procesable por canvas, devolver original
  if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        let { width, height } = img

        // Redimensionar manteniendo proporción de aspecto
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        // Fondo blanco para prevenir transparencias negras en PNGs convertidos a JPEG
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })

            // Si por alguna razón el comprimido quedó más grande, usamos el original
            resolve(compressedFile.size < file.size ? compressedFile : file)
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => resolve(file)
    }

    reader.onerror = () => resolve(file)
  })
}
