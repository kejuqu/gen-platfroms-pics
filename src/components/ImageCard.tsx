// src/components/ImageCard.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { StoredImage } from '@/lib/db'
import { PURE_DEVICES, SELLER_DEVICES } from '@/lib/tokens'
import { downloadBlob } from '@/lib/download'
import { blobToImage, downloadDeviceImage, downloadDeviceSet } from '@/lib/generate'
import { DEVICE_DEFS } from '@/lib/render/devices'
import { renderDeviceImage } from '@/lib/render/canvas'

export function ImageCard({
  image,
  onDelete,
  onGenerated,
}: {
  image: StoredImage
  onDelete: () => void
  onGenerated: () => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const thumbUrl = useMemo(() => URL.createObjectURL(image.blob), [image.blob])
  useEffect(() => () => URL.revokeObjectURL(thumbUrl), [thumbUrl])

  useEffect(() => {
    let cancelled = false
    blobToImage(image.blob)
      .then((i) => { if (!cancelled) setImg(i) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [image.blob])

  // 预览 canvases：每个设备一张，当前时间
  const previews = useMemo(() => {
    if (!img) return []
    const now = new Date()
    return SELLER_DEVICES.map((meta) => {
      const canvas = renderDeviceImage(img, meta.kind, { showTime: true, now, scale: 1 })
      return { meta, url: canvas.toDataURL('image/png') }
    })
  }, [img])

  async function runDownload(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      onGenerated()
    } catch {
      alert('下载失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="rounded-card bg-white p-5 shadow-card">
        <p className="text-sm text-rose-600">「{image.name}」图片读取失败，可能已损坏。</p>
        <button onClick={onDelete} className="mt-3 text-xs text-ink/50 underline">删除记录</button>
      </div>
    )
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbUrl} alt={image.name} className="h-14 w-14 rounded-lg object-cover" />
          <div>
            <p className="max-w-[16rem] truncate text-sm font-semibold text-ink">{image.name}</p>
            <p className="text-xs text-ink/50">{new Date(image.createdAt).toLocaleString('zh-CN')}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            disabled={busy || !img}
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, SELLER_DEVICES, 'seller', image.name))}
            className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            下载全部预览图（5 张）
          </button>
          <button
            disabled={busy || !img}
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, PURE_DEVICES, 'pure', image.name))}
            className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            下载交付三图（无时间）
          </button>
          <button
            onClick={() => downloadBlob(image.blob, image.name)}
            className="rounded-full border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            下载原图
          </button>
          <button
            onClick={onDelete}
            className="rounded-full px-3 py-1.5 text-xs text-ink/40 transition hover:bg-rose-50 hover:text-rose-600"
          >
            删除
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {previews.map(({ meta, url }) => (
          <figure key={meta.kind} className="group relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${meta.label} 预览`}
              style={{ width: DEVICE_DEFS[meta.kind].width, height: DEVICE_DEFS[meta.kind].height }}
              className="rounded-thumb shadow-card"
            />
            <figcaption className="mt-1.5 text-center text-xs text-ink/60">{meta.label}</figcaption>
            <button
              disabled={busy || !img}
              onClick={() =>
                runDownload(async () => {
                  if (!img) return
                  await downloadDeviceImage(img, meta, 'seller', image.name, true)
                })
              }
              className="absolute inset-x-0 top-0 rounded-thumb bg-ink/55 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-0"
            >
              下载 PNG
            </button>
          </figure>
        ))}
        {!img && <p className="py-10 text-sm text-ink/40">正在加载图片…</p>}
      </div>
    </div>
  )
}
