// src/lib/generate.ts
import type { DeviceMeta } from './tokens'
import { deviceFileName } from './tokens'
import { canvasToBlob, downloadBlob } from './download'
import { EXPORT_SCALE, renderSellerScene } from './render/canvas'
import { extractGradientStops } from './render/color'

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

/** 渲染单张卖家预览场景图为 Blob（不下载），供单张与 ZIP 批量共用 */
export async function renderSellerBlob(
  img: HTMLImageElement,
  meta: DeviceMeta,
  originalName: string,
): Promise<Blob> {
  const backdrop = extractGradientStops(img)
  const canvas = renderSellerScene(img, meta.kind, { showTime: true, now: new Date(), backdrop, scale: EXPORT_SCALE })
  return canvasToBlob(canvas)
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

/** 按设备组批量下载，每张之间小间隔避免浏览器拦截 */
export async function downloadDeviceSet(
  blob: Blob,
  devices: DeviceMeta[],
  originalName: string,
): Promise<void> {
  const img = await blobToImage(blob)
  for (let i = 0; i < devices.length; i++) {
    await downloadDeviceImage(img, devices[i], originalName)
    if (i < devices.length - 1) await new Promise((r) => setTimeout(r, 300))
  }
}
