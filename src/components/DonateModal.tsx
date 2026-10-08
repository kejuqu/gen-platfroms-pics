// src/components/DonateModal.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";

function QrImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const { t } = useI18n();
  if (failed) {
    return (
      <div className="flex h-64 w-44 flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/10 text-xs text-primary">
        <span>{t("donate.qrPendingLine1")}</span>
        <span>{t("donate.qrPendingLine2")}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-64 w-44 rounded-xl border border-white/10 bg-transparent object-cover"
    />
  );
}

export function DonateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("donate.title")}</DialogTitle>
          <DialogDescription>{t("donate.body")}</DialogDescription>
        </DialogHeader>
        <div className="flex items-start justify-center gap-6">
          <div className="text-center">
            <QrImage src="/donate/alipay.png" alt={t("donate.alipay")} />
            <p className="mt-2 text-sm font-medium text-card-foreground">
              {t("donate.alipay")}
            </p>
          </div>
          <div className="text-center">
            <QrImage src="/donate/wechat.png" alt={t("donate.wechat")} />
            <p className="mt-2 text-sm font-medium text-card-foreground">
              {t("donate.wechat")}
            </p>
          </div>
        </div>
        <DialogClose asChild>
          <Button className="w-full rounded-full bg-gradient-to-r from-brand-500 to-rose-500 text-white hover:from-brand-600 hover:to-rose-600">
            {t("donate.close")}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
