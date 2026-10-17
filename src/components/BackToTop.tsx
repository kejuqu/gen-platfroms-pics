"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * 返回顶部：顶部上传区滚出视口后，右下角浮现按钮，点击平滑滚动到顶部。
 * 通过监听哨兵元素的可见性判断上传区是否已隐藏。
 */
export function BackToTop() {
  const { t } = useI18n();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* 哨兵：位于顶部上传区之后，滚出视口即说明上传区被隐藏 */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <Button
        variant="secondary"
        size="icon"
        aria-label={t("backToTop")}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full shadow-lg transition-all duration-300",
          hidden
            ? "pointer-events-none translate-y-2 opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <ArrowUp />
      </Button>
    </>
  );
}
