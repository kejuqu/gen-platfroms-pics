"use client";

import { CHINA_DOMAINS } from "@/app/constants";
import { useI18n } from "@/lib/i18n/context";

/** 全站页脚：联系邮箱 + ICP 备案号（备案号按法规需链接到工信部备案页） */
export function SiteFooter() {
  const { t } = useI18n();

  if (
    CHINA_DOMAINS.some((d) => d.includes(window.location.hostname)) ||
    window.location.href.includes("footer")
  ) {
    return (
      <footer className="relative z-10 border-t w-full mx-auto max-w-6xl border-white/5 bg-black/20 py-6 rounded-md my-6 backdrop-blur-sm">
        <div className="w-full flex flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row">
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

  return null;
}
