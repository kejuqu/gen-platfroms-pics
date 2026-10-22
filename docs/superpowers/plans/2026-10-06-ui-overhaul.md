# UI 全面升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 瀑布流布局、极光动态背景、失败态优化、设备描边细化、删除二次确认、shadcn/ui 组件化、中英双语。

**Architecture:** 自研轻量 i18n（React Context + 纯数据字典，不引 next-intl）；shadcn/ui 手写配置与组件源（非 CLI 交互）；极光背景纯 CSS；设备几何收窄在 devices.ts 单点改。

**Tech Stack:** Next.js 14 App Router、TailwindCSS 3.4、Radix Dialog/AlertDialog/Slot、sonner、CVA、clsx、tailwind-merge、lucide-react、tailwindcss-animate。

**Spec:** `docs/superpowers/specs/2026-10-06-ui-overhaul-design.md`

**注意：**
- 本机网络访问 registry.npmjs.org 超时，所有 pnpm/npm 命令必须带 `--registry=https://registry.npmmirror.com`。
- 项目已用 pnpm 管理（node_modules 为 pnpm 结构），不要混用 npm install。
- 所有组件 'use client'；RootLayout 保持 server component，Provider 用 client 组件包裹 children。
- 提交信息末尾加 `Co-Authored-By: Claude Code <noreply@anthropic.com>`。
- 设备文件名规范（`pure-`/`seller-` 前缀、设备 tag 英文小写）不变；锁屏日期时间格式英文不变。

---

### Task 1: pnpm 修复 + shadcn 依赖 + cn 工具 + components.json

**Files:**
- Modify: `package.json`
- Create: `src/lib/utils.ts`
- Create: `components.json`

- [ ] **Step 1: 修改 package.json**

在 `"devDependencies"` 之后顶层加：

```json
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild", "fsevents"]
  }
```

（解决 pnpm 11 拦截 esbuild/fsevents 构建脚本导致 `pnpm test` 前置检查失败的问题。）

- [ ] **Step 2: 安装依赖**

Run: `pnpm add class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-alert-dialog sonner tailwindcss-animate --registry=https://registry.npmmirror.com`

Expected: 安装成功，无 ERR_PNPM 错误。

- [ ] **Step 3: 验证测试基线**

Run: `pnpm test`
Expected: 19/19 通过（现状基线）。

- [ ] **Step 4: 创建 src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 5: 创建 components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml components.json src/lib/utils.ts
git commit -m "chore: add shadcn deps, cn util, pnpm onlyBuiltDependencies"
```

---

### Task 2: 主题令牌（globals.css + tailwind.config.ts）

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: globals.css 全文替换**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-500: #f97316;
  --brand-600: #ea580c;
  --rose-500: #f43f5e;
  --rose-600: #e11d48;
  --ink: #2b2118;
  --surface: #fffbf7;

  /* shadcn 主题变量（品牌橙 = primary，玫红 = destructive） */
  --background: 33 100% 97%;
  --foreground: 25 25% 14%;
  --card: 0 0% 100%;
  --card-foreground: 25 25% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 25 25% 14%;
  --primary: 25 95% 53%;
  --primary-foreground: 0 0% 100%;
  --secondary: 33 100% 94%;
  --secondary-foreground: 25 70% 30%;
  --muted: 30 20% 94%;
  --muted-foreground: 25 10% 42%;
  --accent: 33 100% 94%;
  --accent-foreground: 25 70% 30%;
  --destructive: 350 89% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 28 40% 88%;
  --input: 28 40% 82%;
  --ring: 25 95% 53%;
  --radius: 0.75rem;
}

body {
  @apply bg-background text-foreground antialiased;
}
```

说明：删除 body 上旧的静态 radial-gradient 背景（极光在 Task 6 实现）；`bg-surface`/`text-ink` 令牌保留兼容旧组件，新组件用 shadcn 变量。

- [ ] **Step 2: tailwind.config.ts 全文替换**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74',
          400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C',
          800: '#9A3412', 900: '#7C2D12',
        },
        rose: {
          50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF',
          400: '#FB7185', 500: '#F43F5E', 600: '#E11D48', 700: '#BE123C',
          800: '#9F1239', 900: '#881337',
        },
        ink: '#2B2118',
        surface: '#FFFBF7',
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        card: '16px',
        thumb: '20px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 2px 12px rgba(249, 115, 22, 0.12)',
        'card-lg': '0 8px 30px rgba(249, 115, 22, 0.18)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

- [ ] **Step 3: 验证构建**

Run: `pnpm build`
Expected: 构建成功（旧组件用 bg-surface/text-ink 仍可用）。

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat(theme): shadcn css variables wired to brand orange/rose"
```

---

### Task 3: shadcn UI 组件（button / dialog / alert-dialog / sonner）

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/alert-dialog.tsx`
- Create: `src/components/ui/sonner.tsx`

- [ ] **Step 1: button.tsx**

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 2: dialog.tsx**

```tsx
'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
```

- [ ] **Step 3: alert-dialog.tsx**

```tsx
'use client'

import * as React from 'react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-2xl',
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants({ variant: 'destructive' }), className)} {...props} />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)} {...props} />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
```

- [ ] **Step 4: sonner.tsx**

```tsx
'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster(props: ToasterProps) {
  return <Sonner position="top-center" richColors closeButton {...props} />
}
```

- [ ] **Step 5: 验证构建**

Run: `pnpm build` — Expected: 成功（组件未被引用也应通过编译；tsc 会检查文件）。

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): shadcn button, dialog, alert-dialog, sonner components"
```

---

### Task 4: i18n 核心（字典 + 解析 + Provider + 单测）

**Files:**
- Create: `src/lib/i18n/zh.ts`
- Create: `src/lib/i18n/en.ts`
- Create: `src/lib/i18n/index.ts`
- Create: `src/lib/i18n/context.tsx`
- Create: `src/lib/__tests__/i18n.test.ts`

- [ ] **Step 1: 写失败测试 src/lib/__tests__/i18n.test.ts**

```ts
import { describe, expect, it } from 'vitest'
import { detectLocale, translate } from '@/lib/i18n'
import { zh } from '@/lib/i18n/zh'
import { en } from '@/lib/i18n/en'

function keyList(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keyList(v, prefix ? `${prefix}.${k}` : k),
  )
}

describe('dictionaries', () => {
  it('中英文字典 key 集合完全一致', () => {
    expect(keyList(en).sort()).toEqual(keyList(zh).sort())
  })
})

describe('detectLocale', () => {
  it('zh* → zh，其他 → en，缺省 → zh', () => {
    expect(detectLocale('zh-CN')).toBe('zh')
    expect(detectLocale('zh-TW')).toBe('zh')
    expect(detectLocale('en-US')).toBe('en')
    expect(detectLocale('ja-JP')).toBe('en')
    expect(detectLocale(undefined)).toBe('zh')
  })
})

describe('translate', () => {
  it('点路径取值 + {var} 插值', () => {
    expect(translate(zh, zh, 'header.usage', { count: 3, limit: 15 })).toBe('本月已生成 3 / 15 张')
  })
  it('en 字典取值', () => {
    expect(translate(en, zh, 'card.original')).toBe('Download original')
  })
  it('缺 key 回退中文，再缺返回路径本身', () => {
    const partial = { ...en, card: { ...en.card, original: undefined } } as unknown as typeof en
    expect(translate(partial, zh, 'card.original')).toBe(zh.card.original)
    expect(translate(en, zh, 'no.such.key')).toBe('no.such.key')
  })
})
```

Run: `pnpm test -- src/lib/__tests__/i18n.test.ts` — Expected: FAIL（模块不存在）。

- [ ] **Step 2: 创建 src/lib/i18n/zh.ts**

```ts
export const zh = {
  app: { title: '🖼️ 设备预览图生成工具' },
  header: { usage: '本月已生成 {count} / {limit} 张', donate: '☕ 打赏支持' },
  lang: { label: '语言', zh: '中', en: 'EN' },
  upload: {
    title: '点击选择或拖拽多张壁纸到这里',
    hint: '支持 JPG / PNG / WEBP，图片保存在浏览器本地（IndexedDB）',
    aria: '上传图片',
  },
  empty: '还没有图片，先上传几张壁纸吧～',
  card: {
    sellerSet: '下载全部预览图（{count} 张）',
    pureSet: '下载交付三图（无时间）',
    original: '下载原图',
    delete: '删除',
    loading: '正在加载图片…',
    failed: '图片读取失败，可能已损坏',
    retry: '重试',
    previewFailed: '预览生成失败',
    downloadPng: '下载 PNG',
  },
  toast: {
    skipped: '{count} 个非图片文件已跳过',
    saveFailed: '「{name}」保存失败：本地存储空间不足',
    saved: '已保存 {count} 张图片',
    deleted: '已删除「{name}」',
    deleteFailed: '删除失败，请重试',
    loadFailed: '本地数据读取失败',
    downloadFailed: '下载失败，请重试',
  },
  donate: {
    title: '☕ 打赏支持',
    body: '这个工具完全免费、无广告。如果它帮你省了时间，欢迎打赏一杯咖啡～',
    alipay: '支付宝',
    wechat: '微信',
    qrPendingLine1: '二维码',
    qrPendingLine2: '待补充',
    close: '关闭',
  },
  confirmDelete: {
    title: '删除图片',
    description: '确定删除「{name}」吗？此操作不可恢复。',
    cancel: '取消',
    confirm: '确认删除',
  },
  devices: {
    iphone: 'iPhone',
    'ipad-landscape': 'iPad 横屏',
    'ipad-portrait': 'iPad 竖屏',
    macbook: 'MacBook',
    imac: 'iMac',
  },
} as const

export type Dictionary = typeof zh
```

- [ ] **Step 3: 创建 src/lib/i18n/en.ts**

```ts
import type { Dictionary } from './zh'

export const en: Dictionary = {
  app: { title: '🖼️ Device Mockup Studio' },
  header: { usage: 'Generated {count} / {limit} this month', donate: '☕ Buy me a coffee' },
  lang: { label: 'Language', zh: '中', en: 'EN' },
  upload: {
    title: 'Click to select or drag & drop wallpapers here',
    hint: 'Supports JPG / PNG / WEBP. Images are stored locally in your browser (IndexedDB)',
    aria: 'Upload images',
  },
  empty: 'No images yet — upload some wallpapers to get started～',
  card: {
    sellerSet: 'Download all previews ({count})',
    pureSet: 'Download delivery set (no clock)',
    original: 'Download original',
    delete: 'Delete',
    loading: 'Loading image…',
    failed: 'Failed to read the image. It may be corrupted.',
    retry: 'Retry',
    previewFailed: 'Preview failed',
    downloadPng: 'Download PNG',
  },
  toast: {
    skipped: '{count} non-image file(s) skipped',
    saveFailed: 'Failed to save "{name}": local storage is full',
    saved: 'Saved {count} image(s)',
    deleted: 'Deleted "{name}"',
    deleteFailed: 'Delete failed, please retry',
    loadFailed: 'Failed to read local data',
    downloadFailed: 'Download failed, please retry',
  },
  donate: {
    title: '☕ Buy me a coffee',
    body: 'This tool is completely free and ad-free. If it saved you time, tips are welcome～',
    alipay: 'Alipay',
    wechat: 'WeChat',
    qrPendingLine1: 'QR code',
    qrPendingLine2: 'coming soon',
    close: 'Close',
  },
  confirmDelete: {
    title: 'Delete image',
    description: 'Delete "{name}"? This cannot be undone.',
    cancel: 'Cancel',
    confirm: 'Delete',
  },
  devices: {
    iphone: 'iPhone',
    'ipad-landscape': 'iPad (landscape)',
    'ipad-portrait': 'iPad (portrait)',
    macbook: 'MacBook',
    imac: 'iMac',
  },
}
```

- [ ] **Step 4: 创建 src/lib/i18n/index.ts**

```ts
import { zh, type Dictionary } from './zh'
import { en } from './en'

export type { Dictionary }
export type Locale = 'zh' | 'en'

export const dictionaries: Record<Locale, Dictionary> = { zh, en }

/** localStorage 键：记住用户语言选择 */
export const STORAGE_KEY = 'mockup-locale'

/** 浏览器语言 → Locale；zh* → zh，其他 → en，缺省 → zh */
export function detectLocale(lang?: string): Locale {
  if (!lang) return 'zh'
  return lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/** 卡片时间戳等本地格式化用的 BCP-47 tag */
export function dateLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US'
}

type Vars = Record<string, string | number>

function walk(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, dict)
}

/**
 * 点路径取字典值；缺 key 回退 fallback 字典，再缺返回路径本身。
 * 值内 {name} 占位符用 vars 替换。
 */
export function translate(
  dict: Dictionary,
  fallback: Dictionary,
  path: string,
  vars?: Vars,
): string {
  let value = walk(dict, path)
  if (typeof value !== 'string') value = walk(fallback, path)
  if (typeof value !== 'string') return path
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{${k}}`, String(v))
    }
  }
  return value
}

/** 供非组件环境（如需要时）使用；组件内请用 useI18n */
export function getDictionary(locale: Locale): Dictionary {
  return locale === 'zh' ? zh : en
}
```

- [ ] **Step 5: 创建 src/lib/i18n/context.tsx**

```tsx
'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  dictionaries,
  detectLocale,
  translate,
  STORAGE_KEY,
  type Locale,
} from './index'
import { zh } from './zh'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'zh'
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === 'zh' || saved === 'en') return saved
    } catch {
      /* localStorage 不可用时静默回退 */
    }
    return detectLocale(window.navigator.language)
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* 忽略持久化失败 */
    }
  }, [])

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      translate(dictionaries[locale], zh, path, vars),
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
```

- [ ] **Step 6: 跑测试**

Run: `pnpm test -- src/lib/__tests__/i18n.test.ts` — Expected: 5/5 PASS。

- [ ] **Step 7: Commit**

```bash
git add src/lib/i18n/ src/lib/__tests__/i18n.test.ts
git commit -m "feat(i18n): zh/en dictionaries, translate, provider with localStorage persistence"
```

---

### Task 5: Layout 接线（I18nProvider + Toaster + 极光背景）

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: 创建 src/components/AuroraBackground.tsx**

```tsx
export function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora-blob aurora-1" />
      <div className="aurora-blob aurora-2" />
      <div className="aurora-blob aurora-3" />
      <div className="aurora-blob aurora-4" />
    </div>
  )
}
```

- [ ] **Step 2: globals.css 追加极光样式**

在文件末尾追加：

```css
/* ===== 极光动态背景 ===== */
.aurora {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: #fffbf7;
}

.aurora-blob {
  position: absolute;
  border-radius: 9999px;
  filter: blur(90px);
  opacity: 0.5;
  will-change: transform;
}

.aurora-1 {
  width: 60vmax;
  height: 60vmax;
  left: -18vmax;
  top: -22vmax;
  background: radial-gradient(circle, rgba(103, 232, 249, 0.85), transparent 62%);
  animation: aurora-drift-1 46s ease-in-out infinite alternate;
}

.aurora-2 {
  width: 55vmax;
  height: 55vmax;
  right: -20vmax;
  top: -12vmax;
  background: radial-gradient(circle, rgba(196, 181, 253, 0.8), transparent 62%);
  animation: aurora-drift-2 54s ease-in-out infinite alternate;
}

.aurora-3 {
  width: 50vmax;
  height: 50vmax;
  left: 8vmax;
  bottom: -24vmax;
  background: radial-gradient(circle, rgba(249, 168, 212, 0.75), transparent 62%);
  animation: aurora-drift-3 50s ease-in-out infinite alternate;
}

.aurora-4 {
  width: 45vmax;
  height: 45vmax;
  right: 4vmax;
  bottom: -18vmax;
  background: radial-gradient(circle, rgba(253, 186, 116, 0.75), transparent 62%);
  animation: aurora-drift-4 42s ease-in-out infinite alternate;
}

@keyframes aurora-drift-1 {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(14vw, 9vh) scale(1.18); }
}

@keyframes aurora-drift-2 {
  from { transform: translate(0, 0) scale(1.1); }
  to { transform: translate(-12vw, 12vh) scale(0.95); }
}

@keyframes aurora-drift-3 {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(10vw, -10vh) scale(1.12); }
}

@keyframes aurora-drift-4 {
  from { transform: translate(0, 0) scale(0.95); }
  to { transform: translate(-9vw, -8vh) scale(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .aurora-blob {
    animation: none;
  }
}
```

- [ ] **Step 3: layout.tsx 全文替换**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n/context'
import { Toaster } from '@/components/ui/sonner'
import { AuroraBackground } from '@/components/AuroraBackground'

export const metadata: Metadata = {
  title: '设备预览图生成工具',
  description: '上传壁纸，一键生成 iPhone / iPad / MacBook / iMac 设备预览图',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuroraBackground />
        <I18nProvider>{children}</I18nProvider>
        <Toaster />
      </body>
    </html>
  )
}
```

注意：`metadata` 为静态中文即可（浏览器标签页，i18n 只覆盖页面内文案）；`<html lang>` 保持 `zh-CN`（动态 lang 对静态导出收益小，已知取舍）。

- [ ] **Step 4: 验证构建**

Run: `pnpm build` — Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/AuroraBackground.tsx
git commit -m "feat(ui): animated aurora background, mount I18nProvider and Toaster"
```

---

### Task 6: 设备描边细化（devices.ts + canvas.ts + 几何单测）

**Files:**
- Modify: `src/lib/render/devices.ts`
- Modify: `src/lib/render/canvas.ts`
- Modify: `src/lib/render/__tests__/canvas.test.ts`

- [ ] **Step 1: 先加失败的几何约束测试**

在 `src/lib/render/__tests__/canvas.test.ts` 顶部 import 后、`describe('paintDevice', ...)` 之前插入：

```ts
describe('DEVICE_DEFS 几何约束', () => {
  it.each(Object.values(DEVICE_DEFS))('$kind：屏幕在画布内且 bezel 2–8px', (def) => {
    const bezel = Math.min(def.screen.x, def.screen.y)
    expect(bezel).toBeGreaterThanOrEqual(2)
    expect(bezel).toBeLessThanOrEqual(8)
    expect(def.screen.x + def.screen.w).toBeLessThanOrEqual(def.width - 2)
    expect(def.screen.y + def.screen.h).toBeLessThanOrEqual(def.height - 2)
  })

  it('macbook / imac 底座元素在画布内', () => {
    const mb = DEVICE_DEFS.macbook
    const mbBaseBottom = mb.screen.y + mb.screen.h + 6 + 20 // gap 6 + 底座高 20
    expect(mbBaseBottom).toBeLessThanOrEqual(mb.height)
    const imac = DEVICE_DEFS.imac
    const imacStandBottom = imac.screen.y + imac.screen.h + 26 + 16 // 下巴 26 + 支架 16
    expect(imacStandBottom).toBeLessThanOrEqual(imac.height)
  })
})
```

Run: `pnpm test -- src/lib/render/__tests__/canvas.test.ts` — Expected: FAIL（现 macbook 底座 bottom = 14+245+8+22=289 ≤ 302 通过；imac = 12+245+34+52=343 ≤ 356 通过；但 bezel 断言：iphone bezel 7 通过、ipad 15 > 8 应 FAIL）。确认至少一条 FAIL 即 red。

- [ ] **Step 2: devices.ts 全文替换**

```ts
// src/lib/render/devices.ts
import type { DeviceKind } from '../tokens'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface DeviceDef {
  kind: DeviceKind
  /** 整个画布（含外框/底座）尺寸，CSS px */
  width: number
  height: number
  /** 屏幕区域（壁纸+时钟绘制范围） */
  screen: Rect
  screenRadius: number
  hasIsland: boolean
  /** macbook: 键盘底座；imac: 下巴+支架 */
  base?: 'keyboard' | 'chin'
}

export const DEVICE_DEFS: Record<DeviceKind, DeviceDef> = {
  iphone: {
    kind: 'iphone',
    width: 180,
    height: 370,
    screen: { x: 3, y: 3, w: 174, h: 364 },
    screenRadius: 24,
    hasIsland: true,
  },
  'ipad-landscape': {
    kind: 'ipad-landscape',
    width: 430,
    height: 310,
    screen: { x: 8, y: 8, w: 414, h: 294 },
    screenRadius: 12,
    hasIsland: false,
  },
  'ipad-portrait': {
    kind: 'ipad-portrait',
    width: 310,
    height: 430,
    screen: { x: 8, y: 8, w: 294, h: 414 },
    screenRadius: 12,
    hasIsland: false,
  },
  macbook: {
    kind: 'macbook',
    width: 430,
    height: 285,
    screen: { x: 8, y: 8, w: 414, h: 245 },
    screenRadius: 8,
    hasIsland: false,
    base: 'keyboard',
  },
  imac: {
    kind: 'imac',
    width: 430,
    height: 300,
    screen: { x: 8, y: 8, w: 414, h: 245 },
    screenRadius: 8,
    hasIsland: false,
    base: 'chin',
  },
}
```

- [ ] **Step 3: canvas.ts 修改 paintDevice 外框 + 两个底座函数**

`paintDevice` 中 `ctx.fillStyle = '#101014'` 整段替换为金属渐变：

```ts
  const frameGrad = ctx.createLinearGradient(0, 0, def.width, def.height)
  frameGrad.addColorStop(0, '#2a2a31')
  frameGrad.addColorStop(0.5, '#121216')
  frameGrad.addColorStop(1, '#1e1e24')
  ctx.fillStyle = frameGrad
  ctx.fillRect(0, 0, def.width, def.height)
```

`drawMacBookBase` 全文替换（底座收窄、gap 6、高 20）：

```ts
/** MacBook 键盘底座 + 摄像头 notch */
function drawMacBookBase(ctx: CanvasRenderingContext2D, def: DeviceDef): void {
  const { width, screen } = def
  const baseY = screen.y + screen.h + 6
  ctx.save()
  const grad = ctx.createLinearGradient(0, baseY, 0, baseY + 20)
  grad.addColorStop(0, '#e8e8ec')
  grad.addColorStop(1, '#c8c8cf')
  ctx.fillStyle = grad
  roundedRectPath(ctx, 6, baseY, width - 12, 20, 6)
  ctx.fill()
  ctx.fillStyle = '#b4b4bc'
  roundedRectPath(ctx, width / 2 - 34, baseY + 3, 68, 13, 4)
  ctx.fill()
  ctx.fillStyle = '#0a0a0c'
  roundedRectPath(ctx, screen.x + screen.w / 2 - 14, screen.y, 28, 10, 0)
  ctx.fill()
  ctx.restore()
}
```

`drawImacBase` 全文替换（下巴 26、支架 16、整体收窄）：

```ts
/** iMac 下巴 + 支架 */
function drawImacBase(ctx: CanvasRenderingContext2D, def: DeviceDef): void {
  const { width, screen } = def
  const chinY = screen.y + screen.h
  ctx.save()
  const grad = ctx.createLinearGradient(0, chinY, 0, chinY + 26)
  grad.addColorStop(0, '#ececee')
  grad.addColorStop(1, '#d4d4d9')
  ctx.fillStyle = grad
  ctx.fillRect(4, chinY, width - 8, 26)
  ctx.fillStyle = '#b9b9c0'
  ctx.beginPath()
  ctx.arc(width / 2, chinY + 13, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#c9c9cf'
  ctx.beginPath()
  ctx.moveTo(width / 2 - 26, chinY + 26)
  ctx.lineTo(width / 2 + 26, chinY + 26)
  ctx.lineTo(width / 2 + 38, chinY + 42)
  ctx.lineTo(width / 2 - 38, chinY + 42)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
```

- [ ] **Step 4: 跑测试**

Run: `pnpm test` — Expected: 全部 PASS（19 旧 + 6 新 = 25 个用例左右；画布 stub 的 createLinearGradient 已存在，无需改 stub）。

- [ ] **Step 5: Commit**

```bash
git add src/lib/render/devices.ts src/lib/render/canvas.ts src/lib/render/__tests__/canvas.test.ts
git commit -m "feat(render): slimmer device bezels, metallic frame gradient, tighter bases"
```

---

### Task 7: Header + 语言切换器

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Header.tsx 全文替换**

```tsx
// src/components/Header.tsx
'use client'

import { Button } from '@/components/ui/button'
import { USAGE_LIMIT } from '@/lib/usage'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export function Header({
  usageCount,
  onDonate,
}: {
  usageCount: number
  onDonate: () => void
}) {
  const { locale, setLocale, t } = useI18n()

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100/60 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-ink">{t('app.title')}</h1>
          <p className="text-xs text-ink/50">
            {t('header.usage', { count: usageCount, limit: USAGE_LIMIT })}
          </p>
        </div>
        <div
          role="group"
          aria-label={t('lang.label')}
          className="flex shrink-0 items-center rounded-full border border-brand-200 bg-white/70 p-0.5 text-xs font-semibold"
        >
          {(['zh', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              className={cn(
                'rounded-full px-2.5 py-1 transition',
                locale === l ? 'bg-brand-500 text-white' : 'text-ink/60 hover:text-ink',
              )}
            >
              {t(`lang.${l}`)}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={onDonate}
          className="shrink-0 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700"
        >
          {t('header.donate')}
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: 验证构建**

Run: `pnpm build` — Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat(header): i18n strings and zh/en language switcher"
```

---

### Task 8: 删除确认按钮组件 + ImageCard 重做（失败态/骨架/预览隔离/i18n）

**Files:**
- Create: `src/components/DeleteImageButton.tsx`
- Modify: `src/components/ImageCard.tsx`

- [ ] **Step 1: 创建 src/components/DeleteImageButton.tsx**

```tsx
// src/components/DeleteImageButton.tsx
'use client'

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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/context'

/**
 * 删除二次确认按钮。triggerVariant 允许在失败态里用 destructive 小按钮。
 */
export function DeleteImageButton({
  name,
  onConfirm,
  triggerVariant = 'ghost',
}: {
  name: string
  onConfirm: () => void
  triggerVariant?: 'ghost' | 'destructive'
}) {
  const { t } = useI18n()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size="sm"
          className={
            triggerVariant === 'ghost'
              ? 'rounded-full px-3 text-xs text-ink/40 hover:bg-rose-50 hover:text-rose-600'
              : 'rounded-full'
          }
        >
          {triggerVariant === 'ghost' ? t('card.delete') : t('confirmDelete.confirm')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmDelete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('confirmDelete.description', { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('confirmDelete.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('confirmDelete.confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: ImageCard.tsx 全文替换**

```tsx
// src/components/ImageCard.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { StoredImage } from '@/lib/db'
import { PURE_DEVICES, SELLER_DEVICES } from '@/lib/tokens'
import { downloadBlob } from '@/lib/download'
import { blobToImage, downloadDeviceImage, downloadDeviceSet } from '@/lib/generate'
import { DEVICE_DEFS } from '@/lib/render/devices'
import { renderDeviceImage } from '@/lib/render/canvas'
import { Button } from '@/components/ui/button'
import { DeleteImageButton } from '@/components/DeleteImageButton'
import { useI18n } from '@/lib/i18n/context'
import { dateLocale } from '@/lib/i18n'

type PreviewItem =
  | { kind: 'ok'; kindKey: string; url: string }
  | { kind: 'err'; kindKey: string }

export function ImageCard({
  image,
  onDelete,
  onGenerated,
}: {
  image: StoredImage
  onDelete: () => void
  onGenerated: () => void
}) {
  const { t, locale } = useI18n()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    let cancelled = false
    blobToImage(image.blob)
      .then((i) => { if (!cancelled) setImg(i) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [image.blob, retryCount])

  // 预览：每个设备独立 try/catch，单设备失败不影响其他
  const previews = useMemo<PreviewItem[]>(() => {
    if (!img) return []
    const now = new Date()
    return SELLER_DEVICES.map((meta) => {
      try {
        const canvas = renderDeviceImage(img, meta.kind, { showTime: true, now, scale: 1 })
        return { kind: 'ok', kindKey: meta.kind, url: canvas.toDataURL('image/png') }
      } catch {
        return { kind: 'err', kindKey: meta.kind }
      }
    })
  }, [img])

  async function runDownload(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      if (mounted.current) onGenerated()
    } catch {
      if (mounted.current) toast.error(t('toast.downloadFailed'))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  function handleRetry() {
    setImg(null)
    setError(false)
    setRetryCount((c) => c + 1)
  }

  // ===== 失败态：占位 + 重试 + 删除（绝不渲染裂图） =====
  if (error) {
    return (
      <div className="rounded-card bg-white p-5 shadow-card">
        <p className="text-sm font-semibold text-ink">{image.name}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xl">
            ⚠️
          </div>
          <p className="text-sm text-rose-600">{t('card.failed')}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleRetry}>
            {t('card.retry')}
          </Button>
          <DeleteImageButton name={image.name} onConfirm={onDelete} triggerVariant="destructive" />
        </div>
      </div>
    )
  }

  const ready = img !== null

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {ready ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt={image.name}
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div className="h-14 w-14 animate-pulse rounded-lg bg-brand-100" aria-hidden="true" />
          )}
          <div>
            <p className="max-w-[16rem] truncate text-sm font-semibold text-ink">{image.name}</p>
            <p className="text-xs text-ink/50">
              {new Date(image.createdAt).toLocaleString(dateLocale(locale))}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !ready}
            className="rounded-full"
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, SELLER_DEVICES, 'seller', image.name))}
          >
            {t('card.sellerSet', { count: SELLER_DEVICES.length })}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !ready}
            className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, PURE_DEVICES, 'pure', image.name))}
          >
            {t('card.pureSet')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => downloadBlob(image.blob, image.name)}
          >
            {t('card.original')}
          </Button>
          <DeleteImageButton name={image.name} onConfirm={onDelete} />
        </div>
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {previews.map((p) => {
          const meta = SELLER_DEVICES.find((m) => m.kind === p.kindKey)!
          if (p.kind === 'err') {
            return (
              <div
                key={p.kindKey}
                style={{ width: DEVICE_DEFS[p.kindKey].width, height: DEVICE_DEFS[p.kindKey].height }}
                className="flex shrink-0 items-center justify-center rounded-thumb bg-brand-50 text-xs text-ink/40"
              >
                {t('card.previewFailed')}
              </div>
            )
          }
          return (
            <figure key={p.kindKey} className="group relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`${t(`devices.${p.kindKey}`)}`}
                style={{ width: DEVICE_DEFS[p.kindKey].width, height: DEVICE_DEFS[p.kindKey].height }}
                className="rounded-thumb shadow-card"
              />
              <figcaption className="mt-1.5 text-center text-xs text-ink/60">
                {t(`devices.${p.kindKey}`)}
              </figcaption>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !ready}
                onClick={() =>
                  runDownload(async () => {
                    if (!img) return
                    await downloadDeviceImage(img, meta, 'seller', image.name, true)
                  })
                }
                className="absolute inset-x-0 top-0 rounded-thumb bg-ink/55 text-white hover:bg-ink/70 hover:text-white"
              >
                {t('card.downloadPng')}
              </Button>
            </figure>
          )
        })}
        {!ready && <p className="py-10 text-sm text-ink/40">{t('card.loading')}</p>}
      </div>
    </div>
  )
}
```

说明：原实现用 `URL.createObjectURL` 做缩略图，裂图风险即来源于 `<img>` 直接指向未解码的 blob。现改为 `blobToImage` 解码成功后才挂载 `<img src={img.src}>`，失败路径根本不会出现裂图。

- [ ] **Step 3: 验证构建 + 全量测试**

Run: `pnpm build && pnpm test` — Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add src/components/DeleteImageButton.tsx src/components/ImageCard.tsx
git commit -m "feat(card): skeleton/error/retry states, per-device preview isolation, delete confirm, i18n"
```

---

### Task 9: DonateModal → shadcn Dialog + UploadZone i18n

**Files:**
- Modify: `src/components/DonateModal.tsx`
- Modify: `src/components/UploadZone.tsx`

- [ ] **Step 1: DonateModal.tsx 全文替换**

```tsx
// src/components/DonateModal.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/context'

function QrImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  const { t } = useI18n()
  if (failed) {
    return (
      <div className="flex h-44 w-44 flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 text-xs text-brand-700">
        <span>{t('donate.qrPendingLine1')}</span>
        <span>{t('donate.qrPendingLine2')}</span>
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-44 w-44 rounded-xl border border-brand-100 bg-white object-contain"
    />
  )
}

export function DonateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('donate.title')}</DialogTitle>
          <DialogDescription>{t('donate.body')}</DialogDescription>
        </DialogHeader>
        <div className="flex items-start justify-center gap-6">
          <div className="text-center">
            <QrImage src="/donate/alipay.png" alt={t('donate.alipay')} />
            <p className="mt-2 text-sm font-medium text-ink">{t('donate.alipay')}</p>
          </div>
          <div className="text-center">
            <QrImage src="/donate/wechat.png" alt={t('donate.wechat')} />
            <p className="mt-2 text-sm font-medium text-ink">{t('donate.wechat')}</p>
          </div>
        </div>
        <DialogClose asChild>
          <Button className="w-full rounded-full bg-gradient-to-r from-brand-500 to-rose-500 text-white hover:from-brand-600 hover:to-rose-600">
            {t('donate.close')}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: UploadZone.tsx 全文替换（仅文案 i18n，拖拽区保持 role=button）**

```tsx
// src/components/UploadZone.tsx
'use client'

import { useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n/context'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { t } = useI18n()

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    onFiles(Array.from(fileList))
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={t('upload.aria')}
      className={`cursor-pointer rounded-card border-2 border-dashed px-6 py-12 text-center transition ${
        dragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-brand-300 bg-white/60 hover:border-brand-400 hover:bg-brand-50/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="text-4xl">📤</div>
      <p className="mt-3 font-medium text-ink">{t('upload.title')}</p>
      <p className="mt-1 text-xs text-ink/50">{t('upload.hint')}</p>
    </div>
  )
}
```

- [ ] **Step 3: 验证构建**

Run: `pnpm build` — Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/components/DonateModal.tsx src/components/UploadZone.tsx
git commit -m "feat(ui): donate modal on shadcn dialog, upload zone i18n"
```

---

### Task 10: page.tsx 改造（瀑布流 + sonner 替换自研 Toasts）

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/Toasts.tsx`

- [ ] **Step 1: page.tsx 全文替换**

```tsx
// src/app/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/Header'
import { UploadZone } from '@/components/UploadZone'
import { ImageCard } from '@/components/ImageCard'
import { DonateModal } from '@/components/DonateModal'
import { useI18n } from '@/lib/i18n/context'
import { addImage, deleteImage, getAllImages, getUsage, markReminderShown, recordGeneration, type StoredImage } from '@/lib/db'
import { monthKey, shouldRemind } from '@/lib/usage'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export default function Page() {
  const { t } = useI18n()
  const [images, setImages] = useState<StoredImage[]>([])
  const [usageCount, setUsageCount] = useState(0)
  const [donateOpen, setDonateOpen] = useState(false)

  const refreshUsage = useCallback(async () => {
    const u = await getUsage()
    setUsageCount(u.month === monthKey(new Date()) ? u.count : 0)
  }, [])

  // 页面加载：读取图片 + usage；超限且到期则自动弹打赏
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [list, usage] = await Promise.all([getAllImages(), getUsage()])
      if (cancelled) return
      setImages(list)
      setUsageCount(usage.month === monthKey(new Date()) ? usage.count : 0)
      if (shouldRemind(usage, new Date())) {
        setDonateOpen(true)
        await markReminderShown()
      }
    })().catch(() => { if (!cancelled) toast.error(t('toast.loadFailed')) })
    return () => { cancelled = true }
  }, [t])

  async function handleFiles(files: File[]) {
    const valid = files.filter((f) => ACCEPTED.includes(f.type))
    const rejected = files.length - valid.length
    if (rejected > 0) toast.error(t('toast.skipped', { count: rejected }))
    for (const file of valid) {
      try {
        await addImage(file.name, file)
      } catch {
        toast.error(t('toast.saveFailed', { name: file.name }))
      }
    }
    setImages(await getAllImages())
    if (valid.length > 0) toast.success(t('toast.saved', { count: valid.length }))
  }

  async function handleDelete(image: StoredImage) {
    try {
      await deleteImage(image.id)
      setImages(await getAllImages())
      toast.success(t('toast.deleted', { name: image.name }))
    } catch {
      toast.error(t('toast.deleteFailed'))
    }
  }

  // 每次下载动作计数 +1；超限且到提醒期则弹打赏
  async function handleGenerated() {
    const usage = await recordGeneration()
    await refreshUsage()
    if (shouldRemind(usage, new Date())) {
      setDonateOpen(true)
      await markReminderShown()
    }
  }

  return (
    <div className="flex-1">
      <Header usageCount={usageCount} onDonate={() => setDonateOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 pt-6 min-h-[80vh]">
        <UploadZone onFiles={handleFiles} />
        {images.length > 0 && (
          <div className="mt-6 columns-1 gap-4 sm:columns-2 xl:columns-3">
            {images.map((img) => (
              <div key={img.id} className="mb-4 break-inside-avoid">
                <ImageCard
                  image={img}
                  onDelete={() => handleDelete(img)}
                  onGenerated={handleGenerated}
                />
              </div>
            ))}
          </div>
        )}
        {images.length === 0 && (
          <p className="py-10 text-center text-sm text-ink/40">{t('empty')}</p>
        )}
      </main>
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
    </div>
  )
}
```

变化点：删除自研 toast state/timers（sonner 接管）；卡片列表套 `columns-1 sm:columns-2 xl:columns-3` 瀑布流容器，卡片外包 `mb-4 break-inside-avoid`；挂载 effect 依赖 `t`（locale 切换后错误提示语言即时更新）。

- [ ] **Step 2: 删除 Toasts.tsx**

```bash
git rm src/components/Toasts.tsx
```

- [ ] **Step 3: 全量验证**

Run: `pnpm test && pnpm build` — Expected: 全部通过，构建导出 out/ 成功。

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(page): masonry layout, sonner toasts replace custom Toasts, i18n"
```

---

### Task 11: 最终验证

**Files:**
- 无修改，仅验证。

- [ ] **Step 1: 全量测试**

Run: `pnpm test` — Expected: 全部 PASS（i18n 5 + 几何 6 + 既有 19 ≈ 30）。

- [ ] **Step 2: 静态构建**

Run: `pnpm build` — Expected: `out/` 导出成功，无类型错误。

- [ ] **Step 3: 冒烟检查**

```bash
npx serve out -l 3456 &
sleep 3
curl -s http://localhost:3456/ | grep -c "设备预览图生成工具"
```

Expected: ≥1。

- [ ] **Step 4: 手工验证清单（交还用户）**

1. 上传多张图 → 卡片呈 1/2/3 列瀑布流，随窗口宽度变化
2. 背景为青/紫/粉/橙极光缓慢漂移，`prefers-reduced-motion` 下静止
3. Header 点「中/EN」→ 全站文案即时切换，刷新后保持
4. 删除 → 弹 AlertDialog 二次确认，确认后才删除
5. 打赏 → shadcn Dialog，QR 缺失时显示占位
6. 下载 seller/pure 图 → 文件名仍为 `seller-<tag>-<原名>.png` / `pure-<tag>-<原名>.png`
7. 设备图描边明显变细，MacBook/iMac 底部无深色窄带
8. 上传一张损坏文件（改扩展名）→ 卡片显示失败态（无裂图），可重试/删除

---

## Self-Review 记录

- **Spec 覆盖**：7 项需求均有对应 Task（瀑布流 T10 / 极光 T5 / 失败态 T8 / 描边 T6 / 删除确认 T8 / shadcn T1–T3+替换点 / 多语言 T4+贯穿 / pnpm 修复 T1）。
- **占位符扫描**：无 TBD；所有代码块完整。
- **类型一致性**：`Dictionary` 单一来源（zh.ts `as const`），en.ts 显式标注；`translate(dict, fallback, path, vars)` 签名在 index.ts、context.tsx、测试三处一致；`DeleteImageButton` props（name/onConfirm/triggerVariant）与 T8 两处调用一致；DEVICE_DEFS 新几何与 T6 测试算式（macbook: gap6+高20；imac: 下巴26+支架16）一致。
- **已知取舍**：`<html lang>` 保持 zh-CN 不动；sonner 的 Toaster 文案（如 close 按钮 aria）不做翻译（库内部字符串）。

