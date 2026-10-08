// src/components/Header.tsx
'use client'

import { Button } from '@/components/ui/button'
import { DisabledTip } from '@/components/DisabledTip'
import { USAGE_LIMIT } from '@/lib/usage'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export function Header({
  usageCount,
  onDonate,
  onDownloadAll,
  downloadAllDisabled,
  downloadAllBusy,
}: {
  usageCount: number
  onDonate: () => void
  onDownloadAll: () => void
  downloadAllDisabled: boolean
  downloadAllBusy: boolean
}) {
  const { locale, setLocale, t } = useI18n()
  // 禁用原因（hover 以 tooltip 展示）：打包中 > 没有图片
  const downloadAllReason = downloadAllBusy
    ? t('card.tipBusy')
    : downloadAllDisabled
      ? t('header.tipEmpty')
      : null

  return (
    // 粘性定位由 page.tsx 的顶部粘性区统一负责
    <header>
      <div className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">{t('app.title')}</h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            {t('header.usage', { count: usageCount, limit: USAGE_LIMIT })}
          </p>
        </div>
        <DisabledTip reason={downloadAllReason}>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 rounded-full"
            disabled={downloadAllDisabled}
            onClick={onDownloadAll}
          >
            {downloadAllBusy ? `⏳ ${t('header.downloadAll')}` : t('header.downloadAll')}
          </Button>
        </DisabledTip>
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
