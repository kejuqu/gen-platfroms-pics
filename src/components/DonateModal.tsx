// src/components/DonateModal.tsx
'use client'

import { useState } from 'react'

function QrImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="flex h-44 w-44 items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 text-xs text-brand-700">
        {alt}二维码
        <br />
        待补充
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-44 w-44 rounded-xl border border-brand-100 object-contain"
    />
  )
}

export function DonateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card bg-white p-6 shadow-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">☕ 打赏支持</h2>
        <p className="mt-1 text-sm text-ink/60">
          这个工具完全免费、无广告。如果它帮你省了时间，欢迎打赏一杯咖啡～
        </p>
        <div className="mt-5 flex items-start justify-center gap-6">
          <div className="text-center">
            <QrImage src="/donate/alipay.png" alt="支付宝" />
            <p className="mt-2 text-sm font-medium text-ink">支付宝</p>
          </div>
          <div className="text-center">
            <QrImage src="/donate/wechat.png" alt="微信" />
            <p className="mt-2 text-sm font-medium text-ink">微信</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-brand-500 to-rose-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
