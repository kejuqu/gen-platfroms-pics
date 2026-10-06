// src/components/Toasts.tsx
'use client'

export interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'error'
}

export function Toasts({ items }: { items: ToastItem[] }) {
  if (items.length === 0) return null
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      role="status"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-full px-4 py-2 text-sm text-white shadow-card-lg ${
            t.tone === 'error' ? 'bg-rose-600' : 'bg-ink/90'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
