import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { Toaster } from "@/components/ui/sonner";
import { AuroraBackground } from "@/components/AuroraBackground";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "设备预览图生成工具",
  description: "上传壁纸，一键生成 iPhone / iPad / 电脑设备预览图",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="flex flex-1 flex-col">
        <AuroraBackground />
        <I18nProvider>
          <div className="flex flex-1 flex-col">
            {children}

            <SiteFooter />
          </div>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
