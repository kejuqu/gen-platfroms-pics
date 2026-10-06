// src/components/Header.tsx
'use client'

import { USAGE_LIMIT } from '@/lib/usage'

export function Header({
  usageCount,
  onDonate,
}: {
  usageCount: number
  onDonate: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-100/60 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-ink">
            🖼️ 设备预览图生成工具
          </h1>
          <p className="text-xs text-ink/50">
            本月已生成 {usageCount} / {USAGE_LIMIT} 张
          </p>
        </div>
        <button
          onClick={onDonate}
          className="rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-card-lg"
        >
          ☕ 打赏支持
        </button>
      </div>
    </header>
  )
}
