// src/lib/generate.ts
import type { DeviceMeta, Prefix } from './tokens'
import { deviceFileName } from './tokens'
import { canvasToBlob, downloadBlob } from './download'
import { EXPORT_SCALE, renderDeviceImage } from './render/canvas'

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

/** 渲染单张设备图为 Blob（不下载），供单张与 ZIP 批量共用 */
export async function renderDeviceBlob(
  img: HTMLImageElement,
  meta: DeviceMeta,
  prefix: Prefix,
  originalName: string,
  showTime: boolean,
): Promise<Blob> {
  const canvas = renderDeviceImage(img, meta.kind, { showTime, now: new Date(), scale: EXPORT_SCALE })
  return canvasToBlob(canvas)
}

/** 渲染单张设备图并下载（导出尺寸 = EXPORT_SCALE 高清） */
export async function downloadDeviceImage(
  img: HTMLImageElement,
  meta: DeviceMeta,
  prefix: Prefix,
  originalName: string,
  showTime: boolean,
): Promise<void> {
  const blob = await renderDeviceBlob(img, meta, prefix, originalName, showTime)
  downloadBlob(blob, deviceFileName(prefix, meta.tag, originalName))
}

/** 按设备组批量下载，每张之间小间隔避免浏览器拦截 */
export async function downloadDeviceSet(
  blob: Blob,
  devices: DeviceMeta[],
  prefix: Prefix,
  originalName: string,
): Promise<void> {
  const img = await blobToImage(blob)
  for (let i = 0; i < devices.length; i++) {
    await downloadDeviceImage(img, devices[i], prefix, originalName, prefix === 'seller')
    if (i < devices.length - 1) await new Promise((r) => setTimeout(r, 300))
  }
}
