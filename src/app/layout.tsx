import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '设备预览图生成工具',
  description: '上传壁纸，一键生成 iPhone / iPad / MacBook / iMac 设备预览图',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
