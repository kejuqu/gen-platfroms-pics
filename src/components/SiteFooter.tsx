"use client";

import { useEffect, useState } from "react";
import { CHINA_DOMAINS } from "@/app/constants";
import { useI18n } from "@/lib/i18n/context";

/**
 * 全站页脚：联系邮箱 + ICP 备案号（备案号按法规需链接到工信部备案页）。
 * 仅在国内域名（CHINA_DOMAINS）下展示；Vercel 默认域名等场景隐藏。
 * 注意：window 只能在 useEffect / 事件回调里访问，顶层渲染阶段 SSR 没有 window。
 */
export function SiteFooter() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(
      CHINA_DOMAINS.some((d) => window.location.hostname.includes(d)) ||
        window.location.search.includes("footer"),
    );
  }, []);

  if (!visible) return null;

  return (
    <footer className="relative z-10 mx-auto my-6 w-full max-w-6xl rounded-md border border-white/5 bg-black/20 px-4 py-6 backdrop-blur-sm">
      <div className="flex w-full flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <a
          href="mailto:jakequc@163.com"
          className="transition-colors hover:text-foreground"
        >
          {t("footer.email")}: jakequc@163.com
        </a>
        <a
          href={t("footer.beianUrl")}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          备案: {t("footer.icp")}
        </a>
      </div>
    </footer>
  );
}
