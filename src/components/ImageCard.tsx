// src/components/ImageCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import type { StoredImage } from "@/lib/db";
import type { DeviceKind } from "@/lib/tokens";
import { SELLER_DEVICES } from "@/lib/tokens";
import { downloadBlob } from "@/lib/download";
import {
  blobToImage,
  downloadDeviceImage,
  downloadDeviceSet,
} from "@/lib/generate";
import { PREVIEW_BASE, renderThreePreview } from "@/lib/render/three";
import { extractGradientStops } from "@/lib/render/color";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteImageButton } from "@/components/DeleteImageButton";
import { useI18n } from "@/lib/i18n/context";
import { dateLocale } from "@/lib/i18n";

type PreviewItem =
  | { kind: "ok"; kindKey: DeviceKind; url: string }
  | { kind: "err"; kindKey: DeviceKind };

export function ImageCard({
  image,
  onDelete,
  onGenerated,
  selected,
  onSelectChange,
}: {
  image: StoredImage;
  onDelete: () => void;
  onGenerated: () => void;
  selected: boolean;
  onSelectChange: (v: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  /** 灯箱：当前展示的预览在 orderedPreviews 中的下标，null=关闭 */
  const [lightbox, setLightbox] = useState<number | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // 缩略图 objectURL 在 effect 中创建：StrictMode 双挂载时 cleanup 会回收 URL，
  // useMemo 创建的 URL 不会重建（裂图根因），useEffect 则会二次创建新 URL
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(image.blob);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image.blob]);

  useEffect(() => {
    let cancelled = false;
    blobToImage(image.blob)
      .then((i) => {
        if (!cancelled) setImg(i);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [image.blob, retryCount]);

  // 预览：Three.js 渲染（页面展示啥，下载的就是同一张图的 4× 版）
  const previews = useMemo<PreviewItem[]>(() => {
    if (!img) return [];
    const now = new Date("2026/05/20 13:14:15");
    const backdrop = extractGradientStops(img);
    return SELLER_DEVICES.map((meta) => {
      try {
        return {
          kind: "ok",
          kindKey: meta.kind,
          url: renderThreePreview(img, meta.kind, { now, backdrop }),
        };
      } catch {
        return { kind: "err", kindKey: meta.kind };
      }
    });
  }, [img]);

  // 灯箱顺序：电脑 → iPhone → iPad（与卡片视觉布局一致），仅收录渲染成功的预览
  const macPreview = previews.find((p) => p.kindKey === "macbook");
  const phonePreview = previews.find((p) => p.kindKey === "iphone");
  const padPreview = previews.find((p) => p.kindKey === "ipad-landscape");
  const orderedPreviews = [macPreview, phonePreview, padPreview].filter(
    (p): p is PreviewItem => !!p && p.kind === "ok",
  );

  // 灯箱键盘操作：Esc 关闭，←/→ 切换上一张/下一张
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft")
        setLightbox((i) =>
          i === null ? i : (i - 1 + orderedPreviews.length) % orderedPreviews.length,
        );
      if (e.key === "ArrowRight")
        setLightbox((i) => (i === null ? i : (i + 1) % orderedPreviews.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, orderedPreviews.length]);

  // 单个预览渲染：圆角等比图 + 设备名 + 悬浮下载按钮（extraClass 控制布局占比）
  function renderPreview(p: PreviewItem | undefined, extraClass = "") {
    if (!p) return null;
    const meta = SELLER_DEVICES.find((m) => m.kind === p.kindKey)!;
    const dims = PREVIEW_BASE[p.kindKey];
    const aspect = `${dims.width} / ${dims.height}`;
    if (p.kind === "err") {
      return (
        <div
          key={p.kindKey}
          style={{ aspectRatio: aspect }}
          className={`flex items-center justify-center rounded-2xl bg-white/5 text-xs text-muted-foreground ${extraClass}`}
        >
          {t("card.previewFailed")}
        </div>
      );
    }
    return (
      <figure key={p.kindKey} className={`group relative ${extraClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.url}
          alt={t(`devices.${p.kindKey}`)}
          style={{ aspectRatio: aspect }}
          onClick={() => setLightbox(orderedPreviews.indexOf(p))}
          className="h-auto w-full cursor-zoom-in rounded-2xl shadow-card ring-1 ring-white/10"
        />
        <figcaption className="mt-1.5 text-center text-sm font-semibold text-card-foreground/80">
          {t(`devices.${p.kindKey}`)}
        </figcaption>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !ready}
          onClick={() =>
            runDownload(async () => {
              if (!img) return;
              await downloadDeviceImage(img, meta, image.name);
            })
          }
          className="absolute bottom-8 right-2.5 gap-1.5 rounded-full bg-ink/55 px-3 text-xs text-white opacity-0 backdrop-blur-md transition-opacity hover:bg-ink/75 hover:text-white group-hover:opacity-100"
        >
          <Download className="h-3.5 w-3.5" />
          {t("card.downloadPng")}
        </Button>
      </figure>
    );
  }

  // 参考营销图布局：电脑全宽在上，iPhone + iPad 横屏并排在下（底部对齐）
  const lightboxCurrent = lightbox !== null ? orderedPreviews[lightbox] : undefined;

  function handleLightboxDownload() {
    if (!lightboxCurrent || lightboxCurrent.kind !== "ok") return;
    const meta = SELLER_DEVICES.find((m) => m.kind === lightboxCurrent.kindKey)!;
    runDownload(async () => {
      if (!img) return;
      await downloadDeviceImage(img, meta, image.name);
    });
  }

  async function runDownload(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (mounted.current) onGenerated();
    } catch {
      if (mounted.current) toast.error(t("toast.downloadFailed"));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  function handleRetry() {
    setImg(null);
    setError(false);
    setRetryCount((c) => c + 1);
  }

  // ===== 失败态：占位 + 重试 + 删除（绝不渲染裂图） =====
  if (error) {
    return (
      <div className="rounded-card bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-card-foreground">
          {image.name}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-xl">
            ⚠️
          </div>
          <p className="text-sm text-rose-600">{t("card.failed")}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handleRetry}
          >
            {t("card.retry")}
          </Button>
          <DeleteImageButton
            name={image.name}
            onConfirm={onDelete}
            triggerVariant="destructive"
          />
        </div>
      </div>
    );
  }

  const ready = img !== null;

  return (
    <div className="rounded-card bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelectChange(v === true)}
            aria-label={t("toolbar.selectPage")}
            className="mt-1"
          />
          {ready && thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={image.name}
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div
              className="h-14 w-14 animate-pulse rounded-lg bg-white/10"
              aria-hidden="true"
            />
          )}
          <div>
            <p className="max-w-[16rem] truncate text-sm font-semibold text-card-foreground">
              {image.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(image.createdAt).toLocaleString(dateLocale(locale))}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !ready}
            className="rounded-full"
            onClick={() =>
              runDownload(() =>
                downloadDeviceSet(image.blob, SELLER_DEVICES, image.name),
              )
            }
          >
            {t("card.sellerSet", { count: SELLER_DEVICES.length })}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !ready}
            className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
            onClick={() =>
              runDownload(async () => {
                downloadBlob(image.blob, image.name);
              })
            }
          >
            {t("card.deliver")}
          </Button>
          <DeleteImageButton name={image.name} onConfirm={onDelete} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {renderPreview(macPreview, "w-full")}
        <div className="grid grid-cols-[1fr_2fr] items-end gap-4">
          {renderPreview(phonePreview)}
          {renderPreview(padPreview)}
        </div>
        {!ready && (
          <p className="py-10 text-sm text-muted-foreground">
            {t("card.loading")}
          </p>
        )}
      </div>

      {/* 灯箱：点击预览图打开，支持上一张/下一张切换、下载、Esc/点击遮罩关闭 */}
      {lightboxCurrent && lightboxCurrent.kind === "ok" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div
            className="flex max-h-full flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxCurrent.url}
              alt={t(`devices.${lightboxCurrent.kindKey}`)}
              className="max-h-[72vh] w-auto max-w-full rounded-2xl"
            />
            <div className="mt-3 flex items-center gap-3 text-sm font-medium text-white/90">
              <span>{t(`devices.${lightboxCurrent.kindKey}`)}</span>
              <span className="text-white/50">
                {lightbox! + 1} / {orderedPreviews.length}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5 rounded-full"
                onClick={handleLightboxDownload}
              >
                <Download className="h-3.5 w-3.5" />
                {t("card.downloadPng")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setLightbox(null)}
              >
                {t("donate.close")}
              </Button>
            </div>
            <Button
              aria-label="上一张"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink/60 px-2.5 text-white hover:bg-ink/85"
              onClick={() =>
                setLightbox(
                  (i) =>
                    i === null
                      ? i
                      : (i - 1 + orderedPreviews.length) % orderedPreviews.length,
                )
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              aria-label="下一张"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink/60 px-2.5 text-white hover:bg-ink/85"
              onClick={() =>
                setLightbox((i) =>
                  i === null ? i : (i + 1) % orderedPreviews.length,
                )
              }
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              aria-label={t("donate.close")}
              className="absolute right-3 top-3 rounded-full bg-ink/60 px-2 text-white hover:bg-ink/85"
              onClick={() => setLightbox(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
