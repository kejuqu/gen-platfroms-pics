// src/app/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/Header'
import { UploadZone } from '@/components/UploadZone'
import { ImageCard } from '@/components/ImageCard'
import { DonateModal } from '@/components/DonateModal'
import { useI18n } from '@/lib/i18n/context'
import { addImage, deleteImage, getAllImages, getUsage, markReminderShown, recordGeneration, type StoredImage } from '@/lib/db'
import { monthKey, shouldRemind } from '@/lib/usage'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export default function Page() {
  const { t } = useI18n()
  const [images, setImages] = useState<StoredImage[]>([])
  const [usageCount, setUsageCount] = useState(0)
  const [donateOpen, setDonateOpen] = useState(false)

  const refreshUsage = useCallback(async () => {
    const u = await getUsage()
    setUsageCount(u.month === monthKey(new Date()) ? u.count : 0)
  }, [])

  // 页面加载：读取图片 + usage；超限且到期则自动弹打赏
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [list, usage] = await Promise.all([getAllImages(), getUsage()])
      if (cancelled) return
      setImages(list)
      setUsageCount(usage.month === monthKey(new Date()) ? usage.count : 0)
      if (shouldRemind(usage, new Date())) {
        setDonateOpen(true)
        await markReminderShown()
      }
    })().catch(() => { if (!cancelled) toast.error(t('toast.loadFailed')) })
    return () => { cancelled = true }
  }, [t])

  async function handleFiles(files: File[]) {
    const valid = files.filter((f) => ACCEPTED.includes(f.type))
    const rejected = files.length - valid.length
    if (rejected > 0) toast.error(t('toast.skipped', { count: rejected }))
    for (const file of valid) {
      try {
        await addImage(file.name, file)
      } catch {
        toast.error(t('toast.saveFailed', { name: file.name }))
      }
    }
    setImages(await getAllImages())
    if (valid.length > 0) toast.success(t('toast.saved', { count: valid.length }))
  }

  async function handleDelete(image: StoredImage) {
    try {
      await deleteImage(image.id)
      setImages(await getAllImages())
      toast.success(t('toast.deleted', { name: image.name }))
    } catch {
      toast.error(t('toast.deleteFailed'))
    }
  }

  // 每次下载动作计数 +1；超限且到提醒期则弹打赏
  async function handleGenerated() {
    const usage = await recordGeneration()
    await refreshUsage()
    if (shouldRemind(usage, new Date())) {
      setDonateOpen(true)
      await markReminderShown()
    }
  }

  return (
    <div className="min-h-screen">
      <Header usageCount={usageCount} onDonate={() => setDonateOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <UploadZone onFiles={handleFiles} />
        {images.length > 0 && (
          <div className="mt-6 columns-1 gap-4 sm:columns-2 xl:columns-3">
            {images.map((img) => (
              <div key={img.id} className="mb-4 break-inside-avoid">
                <ImageCard
                  image={img}
                  onDelete={() => handleDelete(img)}
                  onGenerated={handleGenerated}
                />
              </div>
            ))}
          </div>
        )}
        {images.length === 0 && (
          <p className="py-10 text-center text-sm text-ink/40">{t('empty')}</p>
        )}
      </main>
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </div>
  )
}
