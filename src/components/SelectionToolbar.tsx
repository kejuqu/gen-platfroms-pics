'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useI18n } from '@/lib/i18n/context'

export function SelectionToolbar({
  totalOnPage,
  selectedCount,
  onToggleAll,
  onDownloadSelected,
  onDeleteSelected,
  busy = false,
}: {
  totalOnPage: number
  selectedCount: number
  onToggleAll: (checked: boolean) => void
  onDownloadSelected: () => void
  onDeleteSelected: () => void
  busy?: boolean
}) {
  const { t } = useI18n()

  if (totalOnPage === 0) return null

  const allChecked = selectedCount === totalOnPage
  const indeterminate = selectedCount > 0 && !allChecked

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card bg-card px-4 py-3 shadow-card">
      <Checkbox
        checked={indeterminate ? 'indeterminate' : allChecked}
        onCheckedChange={(v) => onToggleAll(v === true)}
        aria-label={t('toolbar.selectPage')}
      />
      <span className="text-sm text-muted-foreground">{t('toolbar.selectPage')}</span>
      <span className="text-sm font-medium text-card-foreground">
        {t('toolbar.selected', { count: selectedCount })}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          size="sm"
          className="rounded-full"
          disabled={selectedCount === 0 || busy}
          onClick={onDownloadSelected}
        >
          {t('toolbar.downloadSelected')}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-full"
              disabled={selectedCount === 0 || busy}
            >
              {t('toolbar.deleteSelected')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('confirmDeleteBatch.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDeleteBatch.description', { count: selectedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('confirmDeleteBatch.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteSelected}>
                {t('confirmDeleteBatch.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
