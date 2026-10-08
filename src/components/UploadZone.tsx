// src/components/UploadZone.tsx
"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/context";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { t } = useI18n();

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    onFiles(Array.from(fileList));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={t("upload.aria")}
      className={`cursor-pointer rounded-card border-2 border-dashed px-6 py-12 text-center transition ${
        dragging
          ? "border-primary bg-primary/10"
          : "border-white/20 bg-card/60 hover:border-primary/60 hover:bg-white/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="text-4xl">📤</div>
      <p className="mt-3 font-medium text-foreground">{t("upload.title")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("upload.hint")}</p>
    </div>
  );
}
