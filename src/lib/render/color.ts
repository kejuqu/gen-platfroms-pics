export type RGB = [number, number, number]
export interface GradientStops { from: RGB; to: RGB }

/** 区域平均色：像素区间 [startPixel, startPixel+pixelCount)，alpha<128 跳过；无有效像素回退 [128,128,128] */
export function averageColor(data: Uint8ClampedArray, startPixel: number, pixelCount: number): RGB {
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < pixelCount; i++) {
    const o = (startPixel + i) * 4
    if (o + 3 >= data.length) break
    if (data[o + 3] < 128) continue
    r += data[o]; g += data[o + 1]; b += data[o + 2]; n++
  }
  if (n === 0) return [128, 128, 128]
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

const mix = (c: RGB, t: RGB, k: number): RGB => [
  Math.round(c[0] + (t[0] - c[0]) * k),
  Math.round(c[1] + (t[1] - c[1]) * k),
  Math.round(c[2] + (t[2] - c[2]) * k),
]

/** 左区微提亮、右区微压深 → 对角渐变起止色 */
export function gradientStops(left: RGB, right: RGB): GradientStops {
  return { from: mix(left, [0, 0, 0], 0.28), to: mix(right, [255, 255, 255], 0.42) }
}

/** 浏览器端：cover 采样 48×48 → 左半/右半平均 → gradientStops */
export function extractGradientStops(img: HTMLImageElement): GradientStops {
  const S = 48
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx || !img.naturalWidth) return { from: [128, 128, 128], to: [220, 220, 220] }
  const s = Math.max(S / img.naturalWidth, S / img.naturalHeight)
  const dw = img.naturalWidth * s
  const dh = img.naturalHeight * s
  ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh)
  const { data } = ctx.getImageData(0, 0, S, S)
  const half = (S * S) / 2
  return gradientStops(averageColor(data, 0, half), averageColor(data, half, half))
}
