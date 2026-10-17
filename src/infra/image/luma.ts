/** 壁纸明暗：缩到 32×32 取平均相对亮度（Rec.709）。 */
export async function averageLuma(blob: Blob): Promise<number> {
  const bitmap = await createImageBitmap(blob)
  try {
    const size = 32
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return 0.5

    context.drawImage(bitmap, 0, 0, size, size)
    const { data } = context.getImageData(0, 0, size, size)

    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    return sum / (data.length / 4) / 255
  } finally {
    bitmap.close()
  }
}
