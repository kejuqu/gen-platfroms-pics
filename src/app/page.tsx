// src/app/page.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '@/components/Header'
import { UploadZone } from '@/components/UploadZone'
import { ImageCard } from '@/components/ImageCard'
import { DonateModal } from '@/components/DonateModal'
import { Toasts, type ToastItem } from '@/components/Toasts'
import { addImage, deleteImage, getAllImages, getUsage, markReminderShown, recordGeneration, type StoredImage } from '@/lib/db'
import { monthKey, shouldRemind } from '@/lib/usage'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export default function Page() {
  const [images, setImages] = useState<StoredImage[]>([])
  const [usageCount, setUsageCount] = useState(0)
  const [donateOpen, setDonateOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)
  const toastTimers = useRef<Set<number>>(new Set())

  const toast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastId.current
    setToasts((ts) => [...ts, { id, message, tone }])
    const timer = window.setTimeout(() => {
      toastTimers.current.delete(timer)
      setToasts((ts) => ts.filter((t) => t.id !== id))
    }, 3500)
    toastTimers.current.add(timer)
  }, [])

  useEffect(() => {
    const timers = toastTimers.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

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
    })().catch(() => toast('本地数据读取失败', 'error'))
    return () => { cancelled = true }
  }, [toast])

  async function handleFiles(files: File[]) {
    const valid = files.filter((f) => ACCEPTED.includes(f.type))
    const rejected = files.length - valid.length
    if (rejected > 0) toast(`${rejected} 个非图片文件已跳过`, 'error')
    for (const file of valid) {
      try {
        await addImage(file.name, file)
      } catch {
        toast(`「${file.name}」保存失败：本地存储空间不足`, 'error')
      }
    }
    setImages(await getAllImages())
    if (valid.length > 0) toast(`已保存 ${valid.length} 张图片`)
  }

  async function handleDelete(image: StoredImage) {
    try {
      await deleteImage(image.id)
      setImages(await getAllImages())
      toast(`已删除「${image.name}」`)
    } catch {
      toast('删除失败，请重试', 'error')
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
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <UploadZone onFiles={handleFiles} />
        {images.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/40">
            还没有图片，先上传几张壁纸吧～
          </p>
        ) : (
          images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onDelete={() => handleDelete(img)}
              onGenerated={handleGenerated}
            />
          ))
        )}
      </main>
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
      <Toasts items={toasts} />
    </div>
  )
}
