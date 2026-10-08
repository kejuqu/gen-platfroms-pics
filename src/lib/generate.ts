// src/lib/generate.ts
import type { DeviceMeta } from './tokens'
import { deviceFileName } from './tokens'
import { dataURLToBlob, downloadBlob } from './download'
import { EXPORT_SCALE } from './render/canvas'
import { extractGradientStops } from './render/color'
import { renderThreePreview } from './render/three'

export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

/** 渲染单张卖家预览场景图为 Blob（不下载），供单张与 ZIP 批量共用。与页面预览同一渲染，4× 高清。 */
export async function renderSellerBlob(
  img: HTMLImageElement,
  meta: DeviceMeta,
  originalName: string,
): Promise<Blob> {
  const backdrop = extractGradientStops(img)
  const url = renderThreePreview(img, meta.kind, { now: new Date(), backdrop, scale: EXPORT_SCALE })
  return dataURLToBlob(url)
}

/** 渲染单张卖家预览图并下载（导出尺寸 = EXPORT_SCALE 高清） */
export async function downloadDeviceImage(
  img: HTMLImageElement,
  meta: DeviceMeta,
  originalName: string,
): Promise<void> {
  const blob = await renderSellerBlob(img, meta, originalName)
  downloadBlob(blob, deviceFileName(meta.tag, originalName))
}
