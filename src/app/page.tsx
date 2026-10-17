// src/app/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { ImageCard } from "@/components/ImageCard";
import { DonateModal } from "@/components/DonateModal";
import { PaginationBar } from "@/components/PaginationBar";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { BackToTop } from "@/components/BackToTop";
import { useI18n } from "@/lib/i18n/context";
import {
  addImage,
  deleteImage,
  getAllImages,
  getUsage,
  markReminderShown,
  recordGeneration,
  type StoredImage,
} from "@/lib/db";
import { monthKey, shouldRemind } from "@/lib/usage";
import { paginate } from "@/lib/pagination";
import { buildZipBlob, zipFileName } from "@/lib/batch";
import { downloadBlob } from "@/lib/download";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const PAGE_SIZE = 6;

export default function Page() {
  const { t } = useI18n();
  const [images, setImages] = useState<StoredImage[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [donateOpen, setDonateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [zipBusy, setZipBusy] = useState(false);

  const refreshUsage = useCallback(async () => {
    const u = await getUsage();
    setUsageCount(u.month === monthKey(new Date()) ? u.count : 0);
  }, []);

  const { pageItems, pageCount, safePage } = useMemo(
    () => paginate(images, page, PAGE_SIZE),
    [images, page],
  );

  // 删除/上传导致页数变化时，回退到有效页码
  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  // 翻页清空选择（选择范围=当前页）
  useEffect(() => {
    setSelected(new Set());
  }, [safePage]);

  // 页面加载：读取图片 + usage；超限且到期则自动弹打赏
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [list, usage] = await Promise.all([getAllImages(), getUsage()]);
      if (cancelled) return;
      setImages(list);
      setUsageCount(usage.month === monthKey(new Date()) ? usage.count : 0);
      if (shouldRemind(usage, new Date())) {
        setDonateOpen(true);
        await markReminderShown();
      }
    })().catch(() => {
      if (!cancelled) toast.error(t("toast.loadFailed"));
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleFiles(files: File[]) {
    const valid = files.filter((f) => ACCEPTED.includes(f.type));
    const rejected = files.length - valid.length;
    if (rejected > 0) toast.error(t("toast.skipped", { count: rejected }));
    for (const file of valid) {
      try {
        await addImage(file.name, file);
      } catch {
        toast.error(t("toast.saveFailed", { name: file.name }));
      }
    }
    setImages(await getAllImages());
    setPage(1);
    if (valid.length > 0)
      toast.success(t("toast.saved", { count: valid.length }));
  }

  async function handleDelete(image: StoredImage) {
    try {
      await deleteImage(image.id);
      // 同步从已选集合移除，避免工具栏计数虚高
      setSelected((prev) => {
        if (!prev.has(image.id)) return prev;
        const next = new Set(prev);
        next.delete(image.id);
        return next;
      });
      setImages(await getAllImages());
      toast.success(t("toast.deleted", { name: image.name }));
    } catch {
      toast.error(t("toast.deleteFailed"));
    }
  }

  // 每次下载动作计数 +1；超限且到提醒期则弹打赏
  async function handleGenerated() {
    const usage = await recordGeneration();
    await refreshUsage();
    if (shouldRemind(usage, new Date())) {
      setDonateOpen(true);
      await markReminderShown();
    }
  }

  function toggleOne(id: string, v: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(pageItems.map((i) => i.id)) : new Set());
  }

  async function handleBatchDelete() {
    const ids = Array.from(selected);
    let failed = 0;
    for (const id of ids) {
      try {
        await deleteImage(id);
      } catch {
        failed += 1;
      }
    }
    setSelected(new Set());
    setImages(await getAllImages());
    if (failed > 0)
      toast.error(t("toast.batchDeleteFailed", { count: failed }));
    else toast.success(t("toast.batchDeleted", { count: ids.length }));
  }

  async function handleZip(targets: StoredImage[]) {
    if (zipBusy || targets.length === 0) return;
    setZipBusy(true);
    const toastId = toast.loading(
      t("toast.zipping", { done: 0, total: targets.length }),
    );
    try {
      const { blob, skipped } = await buildZipBlob(targets, ({ done, total }) =>
        toast.loading(t("toast.zipping", { done, total }), { id: toastId }),
      );
      downloadBlob(blob, zipFileName());
      if (skipped > 0)
        toast.warning(t("toast.zipSkipped", { count: skipped }), {
          id: toastId,
        });
      else toast.success(t("toast.zipDone"), { id: toastId });
      await handleGenerated(); // 一次 ZIP 计 1 次 usage
    } catch {
      toast.error(t("toast.zipFailed"), { id: toastId });
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* 顶部粘性区：标题栏 + 上传区 + 选择工具栏，滚动时始终可见 */}
      <div className="border-b border-white/10 bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <Header
            usageCount={usageCount}
            onDonate={() => setDonateOpen(true)}
            onDownloadAll={() => handleZip(images)}
            downloadAllDisabled={zipBusy || images.length === 0}
            downloadAllBusy={zipBusy}
          />
          <UploadZone onFiles={handleFiles} />
        </div>
      </div>
      <BackToTop />
      <section className="sticky top-0 z-30 mx-auto max-w-6xl px-4 ">
        {images.length > 0 && (
          <div className="mt-3">
            <SelectionToolbar
              totalOnPage={pageItems.length}
              selectedCount={selected.size}
              onToggleAll={toggleAll}
              onDownloadSelected={() =>
                handleZip(pageItems.filter((i) => selected.has(i.id)))
              }
              onDeleteSelected={handleBatchDelete}
              busy={zipBusy}
            />
          </div>
        )}
      </section>
      <main className="mx-auto max-w-6xl px-4 pt-6">
        {images.length > 0 && (
          <>
            <div className="space-y-6">
              {pageItems.map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  selected={selected.has(img.id)}
                  onSelectChange={(v) => toggleOne(img.id, v)}
                  onDelete={() => handleDelete(img)}
                  onGenerated={handleGenerated}
                />
              ))}
            </div>
            {/* 分页粘性底部 */}
            {pageCount > 1 && (
              <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-white/10 bg-background/85 px-4 py-3 backdrop-blur rounded-lg">
                <PaginationBar
                  page={safePage}
                  pageCount={pageCount}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
        {images.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t("empty")}
          </p>
        )}
      </main>
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </div>
  );
}
