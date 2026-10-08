"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

export function PaginationBar({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();

  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t("pagination.prev")}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("pagination.page", { page, total: pageCount })}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        {t("pagination.next")}
      </Button>
    </div>
  );
}
