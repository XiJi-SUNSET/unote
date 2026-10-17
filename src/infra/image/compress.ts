const MAX_EDGE = 1600
const QUALITY = 0.82

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

/**
 * 压缩管线：createImageBitmap → 长边 1600 → WebP 0.82 → 失败回退 JPEG。
 * 规则见 docs/03-data-backup.md §3。
 */
export async function compressImage(file: Blob): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建 canvas 上下文')
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await encode(canvas, 'image/webp', QUALITY).catch(() =>
      encode(canvas, 'image/jpeg', 0.85),
    )

    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片编码失败'))),
      type,
      quality,
    )
  })
}
