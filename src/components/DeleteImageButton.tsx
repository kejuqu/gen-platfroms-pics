// src/components/DeleteImageButton.tsx
"use client";

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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

/**
 * 删除二次确认按钮。triggerVariant 允许在失败态里用 destructive 小按钮。
 */
export function DeleteImageButton({
  name,
  onConfirm,
  triggerVariant = "ghost",
}: {
  name: string;
  onConfirm: () => void;
  triggerVariant?: "ghost" | "destructive";
}) {
  const { t } = useI18n();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size="sm"
          className={
            triggerVariant === "ghost"
              ? "rounded-full px-3 text-xs text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
              : "rounded-full"
          }
        >
          {triggerVariant === "ghost"
            ? t("card.delete")
            : t("confirmDelete.confirm")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmDelete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirmDelete.description", { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("confirmDelete.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("confirmDelete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
