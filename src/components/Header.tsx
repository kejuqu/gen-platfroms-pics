// src/components/Header.tsx
'use client'

import { Button } from '@/components/ui/button'
import { USAGE_LIMIT } from '@/lib/usage'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export function Header({
  usageCount,
  onDonate,
}: {
  usageCount: number
  onDonate: () => void
}) {
  const { locale, setLocale, t } = useI18n()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">{t('app.title')}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {t('header.usage', { count: usageCount, limit: USAGE_LIMIT })}
          </p>
        </div>
        <div
          role="group"
          aria-label={t('lang.label')}
          className="flex shrink-0 items-center rounded-full border border-white/15 bg-white/5 p-0.5 text-xs font-semibold"
        >
          {(['zh', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              className={cn(
                'rounded-full px-2.5 py-1 transition',
                locale === l ? 'bg-brand-500 text-white' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`lang.${l}`)}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={onDonate}
          className="shrink-0 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700"
        >
          {t('header.donate')}
        </Button>
      </div>
    </header>
  )
}
