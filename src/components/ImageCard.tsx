// src/components/ImageCard.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { StoredImage } from '@/lib/db'
import type { DeviceKind } from '@/lib/tokens'
import { PURE_DEVICES, SELLER_DEVICES } from '@/lib/tokens'
import { downloadBlob } from '@/lib/download'
import { blobToImage, downloadDeviceImage, downloadDeviceSet } from '@/lib/generate'
import { DEVICE_DEFS } from '@/lib/render/devices'
import { renderDeviceImage } from '@/lib/render/canvas'
import { Button } from '@/components/ui/button'
import { DeleteImageButton } from '@/components/DeleteImageButton'
import { useI18n } from '@/lib/i18n/context'
import { dateLocale } from '@/lib/i18n'

type PreviewItem =
  | { kind: 'ok'; kindKey: DeviceKind; url: string }
  | { kind: 'err'; kindKey: DeviceKind }

export function ImageCard({
  image,
  onDelete,
  onGenerated,
}: {
  image: StoredImage
  onDelete: () => void
  onGenerated: () => void
}) {
  const { t, locale } = useI18n()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // 缩略图 objectURL 在 effect 中创建：StrictMode 双挂载时 cleanup 会回收 URL，
  // useMemo 创建的 URL 不会重建（裂图根因），useEffect 则会二次创建新 URL
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(image.blob)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image.blob])

  useEffect(() => {
    let cancelled = false
    blobToImage(image.blob)
      .then((i) => { if (!cancelled) setImg(i) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [image.blob, retryCount])

  // 预览：每个设备独立 try/catch，单设备失败不影响其他
  const previews = useMemo<PreviewItem[]>(() => {
    if (!img) return []
    const now = new Date()
    return SELLER_DEVICES.map((meta) => {
      try {
        const canvas = renderDeviceImage(img, meta.kind, { showTime: true, now, scale: 1 })
        return { kind: 'ok', kindKey: meta.kind, url: canvas.toDataURL('image/png') }
      } catch {
        return { kind: 'err', kindKey: meta.kind }
      }
    })
  }, [img])

  async function runDownload(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      if (mounted.current) onGenerated()
    } catch {
      if (mounted.current) toast.error(t('toast.downloadFailed'))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function handleRetry() {
    setImg(null)
    setError(false)
    setRetryCount((c) => c + 1)
  }

  // ===== 失败态：占位 + 重试 + 删除（绝不渲染裂图） =====
  if (error) {
    return (
      <div className="rounded-card bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-card-foreground">{image.name}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-xl">
            ⚠️
          </div>
          <p className="text-sm text-rose-600">{t('card.failed')}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleRetry}>
            {t('card.retry')}
          </Button>
          <DeleteImageButton name={image.name} onConfirm={onDelete} triggerVariant="destructive" />
        </div>
      </div>
    )
  }

  const ready = img !== null

  return (
    <div className="rounded-card bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {ready && thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={image.name}
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div className="h-14 w-14 animate-pulse rounded-lg bg-white/10" aria-hidden="true" />
          )}
          <div>
            <p className="max-w-[16rem] truncate text-sm font-semibold text-card-foreground">{image.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(image.createdAt).toLocaleString(dateLocale(locale))}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !ready}
            className="rounded-full"
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, SELLER_DEVICES, 'seller', image.name))}
          >
            {t('card.sellerSet', { count: SELLER_DEVICES.length })}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !ready}
            className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, PURE_DEVICES, 'pure', image.name))}
          >
            {t('card.pureSet')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => downloadBlob(image.blob, image.name)}
          >
            {t('card.original')}
          </Button>
          <DeleteImageButton name={image.name} onConfirm={onDelete} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {previews.map((p) => {
          const meta = SELLER_DEVICES.find((m) => m.kind === p.kindKey)!
          if (p.kind === 'err') {
            return (
              <div
                key={p.kindKey}
                style={{ width: DEVICE_DEFS[p.kindKey].width, height: DEVICE_DEFS[p.kindKey].height }}
                className="flex shrink-0 items-center justify-center rounded-thumb bg-white/5 text-xs text-muted-foreground"
              >
                {t('card.previewFailed')}
              </div>
            )
          }
          return (
            <figure key={p.kindKey} className="group relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={t(`devices.${p.kindKey}`)}
                style={{ width: DEVICE_DEFS[p.kindKey].width, height: DEVICE_DEFS[p.kindKey].height }}
                className="rounded-thumb shadow-card"
              />
              <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
                {t(`devices.${p.kindKey}`)}
              </figcaption>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !ready}
                onClick={() =>
                  runDownload(async () => {
                    if (!img) return
                    await downloadDeviceImage(img, meta, 'seller', image.name, true)
                  })
                }
                className="absolute inset-x-0 top-0 rounded-thumb bg-ink/55 text-white hover:bg-ink/70 hover:text-white"
              >
                {t('card.downloadPng')}
              </Button>
            </figure>
          )
        })}
        {!ready && <p className="py-10 text-sm text-muted-foreground">{t('card.loading')}</p>}
      </div>
    </div>
  )
}
