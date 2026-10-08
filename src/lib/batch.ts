// src/lib/batch.ts
import JSZip from 'jszip'
import type { StoredImage } from './db'
import { SELLER_DEVICES } from './tokens'
import { blobToImage, renderSellerBlob } from './generate'

/** 文件夹名：剥离扩展名 + 非法字符清洗；重名（不区分大小写）时追加 id 前 6 位 */
export function zipFolderName(image: StoredImage, taken: Set<string>): string {
  const base = (image.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_').trim()) || 'image'
  let name = base
  if (taken.has(name.toLowerCase())) name = `${base}-${image.id.slice(0, 6)}`
  taken.add(name.toLowerCase())
  return name
}

/** ZIP 内条目路径：<folder>/seller-<tag>-<base>.png，文件名同样清洗非法字符 */
export function zipEntryName(tag: string, originalName: string, folder: string): string {
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_')
  return `${folder}/seller-${tag}-${base}.png`
}

export interface ZipProgress { done: number; total: number; skipped: number }

/**
 * 把所有壁纸的 seller 5 张预览 + 原始壁纸文件打成 ZIP。单张壁纸渲染失败跳过并计入 skipped。
 * onProgress 每完成一张壁纸回调一次。
 */
export async function buildZipBlob(
  images: StoredImage[],
  onProgress?: (p: ZipProgress) => void,
): Promise<{ blob: Blob; skipped: number }> {
  const zip = new JSZip()
  const taken = new Set<string>()
  let done = 0
  let skipped = 0
  const total = images.length
  for (const image of images) {
    const folder = zipFolderName(image, taken)
    try {
      const img = await blobToImage(image.blob)
      for (const meta of SELLER_DEVICES) {
        zip.file(zipEntryName(meta.tag, image.name, folder),
          await renderSellerBlob(img, meta, image.name))
      }
      zip.file(`${folder}/${image.name.replace(/[\\/]/g, '_')}`, image.blob)
    } catch {
      skipped += 1
    }
    done += 1
    onProgress?.({ done, total, skipped })
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, skipped }
}

/** ZIP 下载文件名：mockups-YYYYMMDD-HHmmss.zip */
export function zipFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `mockups-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.zip`
}
