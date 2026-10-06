# 设备预览图生成工具（Device Mockup Studio）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建纯前端的 Next.js 工具：上传多张壁纸原图 → Canvas 2D 绘制 iPhone/iPad/MacBook/iMac 设备预览图（自动叠加当前时间）→ 按 `seller-*` / `pure-*` 命名规则下载，IndexedDB 存储，超限打赏提醒。

**Architecture:** 单一真实来源渲染：`paintDevice(ctx, def, img, opts)` 纯绘制函数（可用 stub context 单测），浏览器端 `renderDeviceImage()` 负责建 canvas。预览显示 canvas 缩略，下载用 `EXPORT_SCALE = 4` 重新渲染导出 PNG。所有状态在浏览器本地（IndexedDB 存图，usage 计数亦存 IndexedDB）。

**Tech Stack:** Next.js 14 (App Router, output: 'export'), React 18, TailwindCSS 3.4, idb, vitest + fake-indexeddb, TypeScript

**设计文档:** `docs/superpowers/specs/2026-10-06-device-mockup-studio-design.md`

---

## 文件结构

```
package.json / next.config.mjs / tsconfig.json / tailwind.config.ts / postcss.config.mjs / vitest.config.ts
src/
  app/layout.tsx          # HTML 壳 + 字体/标题
  app/page.tsx            # 页面组装：状态、上传、下载、提醒逻辑
  app/globals.css         # tailwind + CSS 变量 design tokens
  lib/tokens.ts           # 设备清单、文件命名 tag（seller/pure 下载用）
  lib/time.ts             # 英文日期/时间格式化（纯函数）
  lib/usage.ts            # 月度计数、15 天提醒判断（纯函数）
  lib/db.ts               # idb 封装：images 表 + usage 表
  lib/download.ts         # Blob 下载、canvas.toBlob 封装
  lib/render/devices.ts   # 设备几何定义
  lib/render/canvas.ts    # paintDevice 绘制核心 + renderDeviceImage 浏览器封装
  components/Header.tsx       # 导航 + 打赏按钮 + 本月计数
  components/UploadZone.tsx   # 拖拽/多选上传
  components/ImageCard.tsx    # 单张原图的工作台卡片（5 设备预览 + 下载按钮）
  components/DonateModal.tsx  # 打赏弹窗（支付宝/微信二维码）
  components/Toasts.tsx       # toast 通知
public/donate/README.md       # 提示放 alipay.png / wechat.png
src/lib/__tests__/time.test.ts
src/lib/__tests__/usage.test.ts
src/lib/__tests__/db.test.ts
src/lib/render/__tests__/canvas.test.ts
```

下载命名规则（spec §3.7）：无时间版 `pure-<deviceTag>-<原图名去扩展名>.png`；售卖版 `seller-<deviceTag>-<原图名去扩展名>.png`。

EXPORT_SCALE = 4（iPhone 导出约 656×1416，清晰够用且内存可控）。

---

### Task 1: 项目脚手架与配置

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "device-mockup-studio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "idb": "^8.0.0",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.3",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: 创建 next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = { output: 'export', images: { unoptimized: true } }
export default nextConfig
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: 创建 tailwind.config.ts（design tokens）**

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
      },
      boxShadow: {
        card: '0 2px 12px rgba(249, 115, 22, 0.12)',
        'card-lg': '0 8px 30px rgba(249, 115, 22, 0.18)',
      },
      borderRadius: { card: '16px', thumb: '20px' },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 5: 创建 postcss.config.mjs 与 vitest.config.ts**

```js
// postcss.config.mjs
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 6: 安装依赖并验证**

Run: `npm install`
Expected: 安装成功，无 peer 依赖报错（如有 warned 可忽略）。

- [ ] **Step 7: 创建 next-env.d.ts 与 .gitignore，提交**

```bash
mkdir -p src/app src/lib/render src/lib/__tests__ src/lib/render/__tests__ src/components public/donate
touch next-env.d.ts
printf 'node_modules/\n.next/\nout/\n.DS_Store\n' > .gitignore
git add -A
git commit -m "chore: scaffold next.js + tailwind + vitest project"
```

---

### Task 2: Design Tokens 全局样式与 App 壳

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: 创建 globals.css**

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
}

body {
  @apply bg-surface text-ink antialiased;
  background-image: radial-gradient(circle at 15% 0%, rgba(249, 115, 22, 0.08), transparent 45%),
    radial-gradient(circle at 85% 10%, rgba(244, 63, 94, 0.07), transparent 40%);
  background-attachment: fixed;
}
```

- [ ] **Step 2: 创建 layout.tsx**

```tsx
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
```

- [ ] **Step 3: 提交**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: design tokens and app shell"
```

---

### Task 3: IndexedDB 封装（lib/db.ts）

**Files:**
- Create: `src/lib/db.ts`
- Test: `src/lib/__tests__/db.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/__tests__/db.test.ts
import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { addImage, deleteImage, getAllImages, getUsage, markReminderShown, recordGeneration, resetDbForTests } from '../db'

beforeEach(async () => { await resetDbForTests() })

describe('images 表', () => {
  it('新增并可读取全部图片，按 createdAt 倒序', async () => {
    const a = await addImage('a.png', new Blob(['x'], { type: 'image/png' }))
    await new Promise(r => setTimeout(r, 5))
    const b = await addImage('b.png', new Blob(['y'], { type: 'image/png' }))
    const all = await getAllImages()
    expect(all.map(i => i.id)).toEqual([b.id, a.id])
    expect(all[0].name).toBe('b.png')
  })

  it('可删除图片', async () => {
    const a = await addImage('a.png', new Blob(['x']))
    await deleteImage(a.id)
    expect(await getAllImages()).toEqual([])
  })
})

describe('usage 表', () => {
  it('初始 usage 为本月 0 次', async () => {
    const u = await getUsage()
    expect(u.count).toBe(0)
    expect(u.month).toMatch(/^\d{4}-\d{2}$/)
  })

  it('recordGeneration 递增计数', async () => {
    await recordGeneration()
    const u = await recordGeneration()
    expect(u.count).toBe(2)
  })

  it('markReminderShown 记录时间戳', async () => {
    await markReminderShown()
    const u = await getUsage()
    expect(u.lastReminder).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/__tests__/db.test.ts`
Expected: FAIL，提示无法解析 `../db`。

- [ ] **Step 3: 实现 lib/db.ts**

```ts
// src/lib/db.ts
import { openDB, type IDBPDatabase } from 'idb'
import { monthKey } from './usage'

export interface StoredImage {
  id: string
  name: string
  blob: Blob
  createdAt: number
}

export interface UsageRecord {
  id: 'usage'
  month: string
  count: number
  lastReminder: number
}

const DB_NAME = 'mockup-studio'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('images', { keyPath: 'id' })
        db.createObjectStore('usage', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function addImage(name: string, blob: Blob): Promise<StoredImage> {
  const image: StoredImage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    blob,
    createdAt: Date.now(),
  }
  const db = await getDB()
  await db.put('images', image)
  return image
}

export async function getAllImages(): Promise<StoredImage[]> {
  const db = await getDB()
  const all = (await db.getAll('images')) as StoredImage[]
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('images', id)
}

export async function getUsage(): Promise<UsageRecord> {
  const db = await getDB()
  const record = (await db.get('usage', 'usage')) as UsageRecord | undefined
  if (!record) return { id: 'usage', month: monthKey(new Date()), count: 0, lastReminder: 0 }
  return record
}

export async function recordGeneration(now: Date = new Date()): Promise<UsageRecord> {
  const db = await getDB()
  const current = await getUsage()
  const record: UsageRecord = {
    id: 'usage',
    month: monthKey(now),
    count: current.month === monthKey(now) ? current.count + 1 : 1,
    lastReminder: current.lastReminder,
  }
  await db.put('usage', record)
  return record
}

export async function markReminderShown(now: Date = new Date()): Promise<void> {
  const db = await getDB()
  const current = await getUsage()
  await db.put('usage', { ...current, lastReminder: now.getTime() })
}

/** 仅测试用：关闭连接并删除数据库 */
export async function resetDbForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/__tests__/db.test.ts`
Expected: PASS（5 个用例）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/db.ts src/lib/__tests__/db.test.ts
git commit -m "feat: indexeddb wrapper for images and usage"
```

---

### Task 4: 使用计数与提醒判断（lib/usage.ts）

**Files:**
- Create: `src/lib/usage.ts`
- Test: `src/lib/__tests__/usage.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/__tests__/usage.test.ts
import { describe, expect, it } from 'vitest'
import { monthKey, shouldRemind, USAGE_LIMIT, REMINDER_INTERVAL_DAYS } from '../usage'

const DAY = 24 * 60 * 60 * 1000

describe('monthKey', () => {
  it('格式为 YYYY-MM，月日补零', () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe('2026-01')
    expect(monthKey(new Date(2026, 11, 31))).toBe('2026-12')
  })
})

describe('shouldRemind', () => {
  const usage = (count: number, lastReminder: number) => ({ id: 'usage' as const, month: '2026-10', count, lastReminder })

  it('未超过限制不提醒', () => {
    expect(shouldRemind(usage(15, 0), new Date(2026, 9, 20))).toBe(false)
  })

  it('超过限制但 15 天内提醒过，不提醒', () => {
    const now = new Date(2026, 9, 20)
    expect(shouldRemind(usage(16, now.getTime() - 5 * DAY), now)).toBe(false)
  })

  it('超过限制且距上次提醒满 15 天，提醒', () => {
    const now = new Date(2026, 9, 20)
    expect(shouldRemind(usage(20, now.getTime() - 15 * DAY), now)).toBe(true)
  })

  it('从未提醒过（lastReminder=0）且超限，提醒', () => {
    expect(shouldRemind(usage(16, 0), new Date(2026, 9, 20))).toBe(true)
  })

  it('常量符合 spec：15 张 / 15 天', () => {
    expect(USAGE_LIMIT).toBe(15)
    expect(REMINDER_INTERVAL_DAYS).toBe(15)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/__tests__/usage.test.ts`
Expected: FAIL，无法解析 `../usage`。

- [ ] **Step 3: 实现 lib/usage.ts**

```ts
// src/lib/usage.ts
import type { UsageRecord } from './db'

export const USAGE_LIMIT = 15
export const REMINDER_INTERVAL_DAYS = 15

const DAY_MS = 24 * 60 * 60 * 1000

export function monthKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** 超限（>15）且距上次提醒 >= 15 天（或从未提醒）时返回 true */
export function shouldRemind(usage: UsageRecord, now: Date): boolean {
  if (usage.month !== monthKey(now)) return false
  if (usage.count <= USAGE_LIMIT) return false
  if (usage.lastReminder === 0) return true
  return now.getTime() - usage.lastReminder >= REMINDER_INTERVAL_DAYS * DAY_MS
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/__tests__/usage.test.ts`
Expected: PASS（5 个用例）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/usage.ts src/lib/__tests__/usage.test.ts
git commit -m "feat: usage limit and reminder logic"
```

---

### Task 5: 时间格式化（lib/time.ts）

**Files:**
- Create: `src/lib/time.ts`
- Test: `src/lib/__tests__/time.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/lib/__tests__/time.test.ts
import { describe, expect, it } from 'vitest'
import { formatLockDate, formatLockTime } from '../time'

describe('formatLockDate', () => {
  it('输出英文「Weekday, Month D」', () => {
    // 2026-10-06 是 Tuesday
    expect(formatLockDate(new Date(2026, 9, 6))).toBe('Tuesday, October 6')
    expect(formatLockDate(new Date(2026, 4, 20))).toBe('Wednesday, May 20')
  })
})

describe('formatLockTime', () => {
  it('输出 24 小时制 HH:MM', () => {
    expect(formatLockTime(new Date(2026, 9, 6, 19, 16))).toBe('19:16')
    expect(formatLockTime(new Date(2026, 9, 6, 9, 5))).toBe('09:05')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/__tests__/time.test.ts`
Expected: FAIL，无法解析 `../time`。

- [ ] **Step 3: 实现 lib/time.ts**

```ts
// src/lib/time.ts
/** 锁屏日期：「Wednesday, May 20」 */
export function formatLockDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/** 锁屏时间：「19:16」24 小时制 */
export function formatLockTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/__tests__/time.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/lib/time.ts src/lib/__tests__/time.test.ts
git commit -m "feat: english lock-screen date/time formatting"
```

---

### Task 6: 设备清单与下载工具（lib/tokens.ts, lib/download.ts）

**Files:**
- Create: `src/lib/tokens.ts`
- Create: `src/lib/download.ts`

说明：`tokens.ts` 汇总设备 tag（文件命名用）、预览设备组（5 个）、交付设备组（pure，3 个）。这两个文件只含常量与薄封装，随 Task 8 的 canvas 测试间接覆盖，不单独写测试。

- [ ] **Step 1: 创建 lib/tokens.ts**

```ts
// src/lib/tokens.ts
export type DeviceKind =
  | 'iphone'
  | 'ipad-landscape'
  | 'ipad-portrait'
  | 'macbook'
  | 'imac'

export interface DeviceMeta {
  kind: DeviceKind
  label: string
  /** 文件名 tag，如 pure-iphone-xxx.png */
  tag: string
}

export const SELLER_DEVICES: DeviceMeta[] = [
  { kind: 'iphone', label: 'iPhone', tag: 'iphone' },
  { kind: 'ipad-landscape', label: 'iPad 横屏', tag: 'ipad-landscape' },
  { kind: 'ipad-portrait', label: 'iPad 竖屏', tag: 'ipad-portrait' },
  { kind: 'macbook', label: 'MacBook', tag: 'macbook' },
  { kind: 'imac', label: 'iMac', tag: 'imac' },
]

/** 无时间交付版（spec：固定三类） */
export const PURE_DEVICES: DeviceMeta[] = [
  { kind: 'iphone', label: 'iPhone', tag: 'iphone' },
  { kind: 'ipad-landscape', label: 'iPad 横屏', tag: 'ipad-landscape' },
  { kind: 'macbook', label: 'MacBook', tag: 'macbook' },
]

export type Prefix = 'seller' | 'pure'

/** seller-<tag>-<basename>.png */
export function deviceFileName(prefix: Prefix, tag: string, originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, '')
  return `${prefix}-${tag}-${base}.png`
}
```

- [ ] **Step 2: 创建 lib/download.ts**

```ts
// src/lib/download.ts
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))), 'image/png')
  })
}
```

- [ ] **Step 3: 提交**

```bash
git add src/lib/tokens.ts src/lib/download.ts
git commit -m "feat: device list, naming rules and download helpers"
```

---

### Task 7: 设备几何定义（lib/render/devices.ts）

**Files:**
- Create: `src/render/../lib/render/devices.ts`（实际路径 `src/lib/render/devices.ts`）

说明：纯常量定义，被 Task 8 测试覆盖。

- [ ] **Step 1: 创建 src/lib/render/devices.ts**

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
    screen: { x: 7, y: 7, w: 166, h: 356 },
    screenRadius: 30,
    hasIsland: true,
  },
  'ipad-landscape': {
    kind: 'ipad-landscape',
    width: 430,
    height: 310,
    screen: { x: 15, y: 15, w: 400, h: 280 },
    screenRadius: 16,
    hasIsland: false,
  },
  'ipad-portrait': {
    kind: 'ipad-portrait',
    width: 310,
    height: 430,
    screen: { x: 15, y: 15, w: 280, h: 400 },
    screenRadius: 16,
    hasIsland: false,
  },
  macbook: {
    kind: 'macbook',
    width: 430,
    height: 302,
    screen: { x: 19, y: 14, w: 392, h: 245 },
    screenRadius: 8,
    hasIsland: false,
    base: 'keyboard',
  },
  imac: {
    kind: 'imac',
    width: 430,
    height: 356,
    screen: { x: 15, y: 12, w: 400, h: 245 },
    screenRadius: 8,
    hasIsland: false,
    base: 'chin',
  },
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/render/devices.ts
git commit -m "feat: device geometry definitions"
```

---

### Task 8: Canvas 绘制核心（lib/render/canvas.ts）— 含 iPhone

**Files:**
- Create: `src/lib/render/canvas.ts`
- Test: `src/lib/render/__tests__/canvas.test.ts`

核心设计：`paintDevice(ctx, def, img, opts, scale)` 是纯绘制函数（只依赖 ctx 接口，node 测试里用 stub context）；`renderDeviceImage()` 是浏览器封装，负责创建 canvas 并调用 paintDevice。预览传 scale=1，导出传 EXPORT_SCALE=4。

- [ ] **Step 1: 写失败测试（stub context 记录调用）**

```ts
// src/lib/render/__tests__/canvas.test.ts
import { describe, expect, it } from 'vitest'
import { DEVICE_DEFS } from '../devices'
import { EXPORT_SCALE, paintDevice, renderDeviceImage, type RenderOptions } from '../canvas'

function createStubContext() {
  const calls = { drawImage: 0, fillText: 0, clip: 0, fill: 0 }
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    shadowColor: '',
    shadowBlur: 0,
    save: () => {},
    restore: () => {},
    scale: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    arc: () => {},
    closePath: () => {},
    clip: () => { calls.clip += 1 },
    fill: () => { calls.fill += 1 },
    fillRect: () => { calls.fill += 1 },
    stroke: () => {},
    drawImage: () => { calls.drawImage += 1 },
    fillText: () => { calls.fillText += 1 },
    createLinearGradient: () => ({ addColorStop: () => {} }),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

const fakeImg = { width: 1200, height: 800 } as unknown as HTMLImageElement

const baseOpts: RenderOptions = { showTime: true, now: new Date(2026, 9, 6, 19, 16) }

describe('paintDevice', () => {
  it('绘制壁纸与两组时间文字（日期+时间）', () => {
    const { ctx, calls } = createStubContext()
    paintDevice(ctx, DEVICE_DEFS.iphone, fakeImg, baseOpts, 1)
    expect(calls.clip).toBeGreaterThanOrEqual(1)
    expect(calls.drawImage).toBe(1)
    expect(calls.fillText).toBe(2)
  })

  it('showTime=false 时不绘制时间文字', () => {
    const { ctx, calls } = createStubContext()
    paintDevice(ctx, DEVICE_DEFS.macbook, fakeImg, { ...baseOpts, showTime: false }, 1)
    expect(calls.fillText).toBe(0)
  })

  it('scale 参数会应用到 context（导出高清图）', () => {
    const { ctx, calls } = createStubContext()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scaleSpy = ctx.scale as any
    // stub 的 scale 不记录，这里只验证 paintDevice 接受 scale=4 不报错且仍绘制
    paintDevice(ctx, DEVICE_DEFS.imac, fakeImg, baseOpts, EXPORT_SCALE)
    expect(calls.drawImage).toBe(1)
    expect(scaleSpy).toBeDefined()
  })
})

describe('renderDeviceImage', () => {
  it('生成的 canvas 尺寸 = 设备尺寸 × scale', () => {
    const c = renderDeviceImage(fakeImg, 'iphone', { ...baseOpts, scale: 1 })
    expect(c.width).toBe(DEVICE_DEFS.iphone.width)
    expect(c.height).toBe(DEVICE_DEFS.iphone.height)
  })
})
```

注意：`renderDeviceImage` 用例依赖 jsdom 的 canvas。jsdom 的 `getContext('2d')` 默认返回 `null`，会报错。需要在测试文件顶部加 canvas mock：

```ts
// 追加在测试文件 import 之后
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function () {
    return createStubContext().ctx as unknown as CanvasRenderingContext2D
  } as typeof HTMLCanvasElement.prototype.getContext
}
```

（`createStubContext` 定义在其后，注意提升顺序——把它放到顶部函数声明位置即可。）

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/lib/render/__tests__/canvas.test.ts`
Expected: FAIL，无法解析 `../canvas`。

- [ ] **Step 3: 实现 lib/render/canvas.ts**

```ts
// src/lib/render/canvas.ts
import type { DeviceKind } from '../tokens'
import { DEVICE_DEFS, type DeviceDef } from './devices'
import { formatLockDate, formatLockTime } from '../time'

export const EXPORT_SCALE = 4

export interface RenderOptions {
  /** true=售卖预览版（带时间），false=交付版（纯设备图） */
  showTime: boolean
  now: Date
  /** 不传 = 1（预览尺寸） */
  scale?: number
}

/** 圆角矩形路径（arcTo 实现，兼容所有 canvas 实现） */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** cover 居中裁剪绘制 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number, y: number, w: number, h: number,
): void {
  const s = Math.max(w / img.width, h / img.height)
  const dw = img.width * s
  const dh = img.height * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/** 锁屏日期+时间（屏幕顶部居中） */
function drawClock(ctx: CanvasRenderingContext2D, def: DeviceDef, now: Date): void {
  const { x, y, w, h } = def.screen
  const cx = x + w / 2
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'

  ctx.font = '600 12px -apple-system, "Helvetica Neue", "Segoe UI", sans-serif'
  ctx.fillText(formatLockDate(now), cx, y + h * 0.1)

  ctx.font = '700 34px -apple-system, "Helvetica Neue", "Segoe UI", sans-serif'
  ctx.fillText(formatLockTime(now), cx, y + h * 0.1 + 30)
  ctx.restore()
}

/** iPhone Dynamic Island */
function drawIsland(ctx: CanvasRenderingContext2D, def: DeviceDef): void {
  const { x, y, w } = def.screen
  ctx.save()
  ctx.fillStyle = '#0a0a0c'
  roundedRectPath(ctx, x + w / 2 - 32, y + 10, 64, 17, 9)
  ctx.fill()
  ctx.restore()
}

/** MacBook 键盘底座 + 摄像头 notch */
function drawMacBookBase(ctx: CanvasRenderingContext2D, def: DeviceDef): void {
  const { width, screen } = def
  const baseY = screen.y + screen.h + 8
  ctx.save()
  // 底座机身
  const grad = ctx.createLinearGradient(0, baseY, 0, baseY + 22)
  grad.addColorStop(0, '#e8e8ec')
  grad.addColorStop(1, '#c8c8cf')
  ctx.fillStyle = grad
  roundedRectPath(ctx, 6, baseY, width - 12, 22, 6)
  ctx.fill()
  // 键盘凹槽
  ctx.fillStyle = '#b4b4bc'
  roundedRectPath(ctx, width / 2 - 34, baseY + 4, 68, 14, 4)
  ctx.fill()
  // notch
  ctx.fillStyle = '#0a0a0c'
  roundedRectPath(ctx, screen.x + screen.w / 2 - 14, screen.y, 28, 10, 0)
  ctx.fill()
  ctx.restore()
}

/** iMac 下巴 + 支架 */
function drawImacBase(ctx: CanvasRenderingContext2D, def: DeviceDef): void {
  const { width, screen } = def
  const chinY = screen.y + screen.h
  ctx.save()
  // 下巴
  const grad = ctx.createLinearGradient(0, chinY, 0, chinY + 34)
  grad.addColorStop(0, '#ececee')
  grad.addColorStop(1, '#d4d4d9')
  ctx.fillStyle = grad
  ctx.fillRect(4, chinY, width - 8, 34)
  // logo 点
  ctx.fillStyle = '#b9b9c0'
  ctx.beginPath()
  ctx.arc(width / 2, chinY + 17, 5, 0, Math.PI * 2)
  ctx.fill()
  // 支架
  ctx.fillStyle = '#c9c9cf'
  ctx.beginPath()
  ctx.moveTo(width / 2 - 26, chinY + 34)
  ctx.lineTo(width / 2 + 26, chinY + 34)
  ctx.lineTo(width / 2 + 40, chinY + 52)
  ctx.lineTo(width / 2 - 40, chinY + 52)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/**
 * 纯绘制函数：在给定 context 上按 CSS 像素单位绘制整台设备。
 * 所有坐标基于 def（devices.ts），scale 通过 ctx.scale 实现高清导出。
 */
export function paintDevice(
  ctx: CanvasRenderingContext2D,
  def: DeviceDef,
  img: HTMLImageElement,
  opts: RenderOptions,
  scale: number,
): void {
  ctx.save()
  ctx.scale(scale, scale)

  // 整机底色（边框/机身）
  ctx.fillStyle = '#101014'
  ctx.fillRect(0, 0, def.width, def.height)

  // 屏幕：圆角裁切 → cover 壁纸 → （可选）时钟
  ctx.save()
  roundedRectPath(ctx, def.screen.x, def.screen.y, def.screen.w, def.screen.h, def.screenRadius)
  ctx.clip()
  drawCover(ctx, img, def.screen.x, def.screen.y, def.screen.w, def.screen.h)
  if (opts.showTime) drawClock(ctx, def, opts.now)
  ctx.restore()

  // 边框高光描边
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 1
  roundedRectPath(ctx, def.screen.x + 0.5, def.screen.y + 0.5, def.screen.w - 1, def.screen.h - 1, def.screenRadius)
  ctx.stroke()
  ctx.restore()

  if (def.hasIsland) drawIsland(ctx, def)
  if (def.base === 'keyboard') drawMacBookBase(ctx, def)
  if (def.base === 'chin') drawImacBase(ctx, def)

  ctx.restore()
}

/** 浏览器封装：创建 canvas 并绘制，返回 canvas（预览与下载共用） */
export function renderDeviceImage(
  img: HTMLImageElement,
  kind: DeviceKind,
  opts: RenderOptions,
): HTMLCanvasElement {
  const def = DEVICE_DEFS[kind]
  const scale = opts.scale ?? 1
  const canvas = document.createElement('canvas')
  canvas.width = def.width * scale
  canvas.height = def.height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  paintDevice(ctx, def, img, opts, scale)
  return canvas
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/lib/render/__tests__/canvas.test.ts`
Expected: PASS（5 个用例）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/render/canvas.ts src/lib/render/__tests__/canvas.test.ts
git commit -m "feat: canvas device renderer for all four device types"
```

---

### Task 9: 生成与下载服务层（lib/generate.ts）

**Files:**
- Create: `src/lib/generate.ts`

说明：把 Blob → HTMLImageElement、按设备组渲染导出、命名下载串起来；组件只调这里。薄封装，不做单测（浏览器 API 为主，绘制逻辑已被 Task 8 覆盖）。

- [ ] **Step 1: 创建 src/lib/generate.ts**

```ts
// src/lib/generate.ts
import type { DeviceMeta, Prefix } from './tokens'
import { deviceFileName } from './tokens'
import { canvasToBlob, downloadBlob } from './download'
import { EXPORT_SCALE, renderDeviceImage } from './render/canvas'

export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

/** 渲染单张设备图并下载（导出尺寸 = EXPORT_SCALE 高清） */
export async function downloadDeviceImage(
  img: HTMLImageElement,
  meta: DeviceMeta,
  prefix: Prefix,
  originalName: string,
  showTime: boolean,
): Promise<void> {
  const canvas = renderDeviceImage(img, meta.kind, { showTime, now: new Date(), scale: EXPORT_SCALE })
  const blob = await canvasToBlob(canvas)
  downloadBlob(blob, deviceFileName(prefix, meta.tag, originalName))
}

/** 按设备组批量下载，每张之间小间隔避免浏览器拦截 */
export async function downloadDeviceSet(
  blob: Blob,
  devices: DeviceMeta[],
  prefix: Prefix,
  originalName: string,
): Promise<void> {
  const img = await blobToImage(blob)
  for (let i = 0; i < devices.length; i++) {
    await downloadDeviceImage(img, devices[i], prefix, originalName, prefix === 'seller')
    if (i < devices.length - 1) await new Promise((r) => setTimeout(r, 300))
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/generate.ts
git commit -m "feat: generate and download device image sets"
```

---

### Task 10: Toast 通知组件

**Files:**
- Create: `components/Toasts.tsx`（实际路径 `src/components/Toasts.tsx`）

- [ ] **Step 1: 创建 src/components/Toasts.tsx**

```tsx
// src/components/Toasts.tsx
'use client'

export interface ToastItem {
  id: number
  message: string
  tone: 'info' | 'error'
}

export function Toasts({ items }: { items: ToastItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-full px-4 py-2 text-sm text-white shadow-card-lg ${
            t.tone === 'error' ? 'bg-rose-600' : 'bg-ink/90'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Toasts.tsx
git commit -m "feat: toast notifications"
```

---

### Task 11: 打赏弹窗

**Files:**
- Create: `src/components/DonateModal.tsx`
- Create: `public/donate/README.md`

- [ ] **Step 1: 创建二维码占位说明**

```markdown
<!-- public/donate/README.md -->
将支付宝收款二维码保存为 alipay.png，微信收款二维码保存为 wechat.png，放在本目录。
```

- [ ] **Step 2: 创建 src/components/DonateModal.tsx**

```tsx
// src/components/DonateModal.tsx
'use client'

import { useState } from 'react'

function QrImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="flex h-44 w-44 items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 text-xs text-brand-700">
        {alt}二维码
        <br />
        待补充
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-44 w-44 rounded-xl border border-brand-100 object-contain"
    />
  )
}

export function DonateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-card bg-white p-6 shadow-card-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-ink">☕ 打赏支持</h2>
        <p className="mt-1 text-sm text-ink/60">
          这个工具完全免费、无广告。如果它帮你省了时间，欢迎打赏一杯咖啡～
        </p>
        <div className="mt-5 flex items-start justify-center gap-6">
          <div className="text-center">
            <QrImage src="/donate/alipay.png" alt="支付宝" />
            <p className="mt-2 text-sm font-medium text-ink">支付宝</p>
          </div>
          <div className="text-center">
            <QrImage src="/donate/wechat.png" alt="微信" />
            <p className="mt-2 text-sm font-medium text-ink">微信</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-brand-500 to-rose-500 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/DonateModal.tsx public/donate/README.md
git commit -m "feat: donate modal with alipay/wechat qr placeholders"
```

---

### Task 12: 顶部导航栏

**Files:**
- Create: `src/components/Header.tsx`

- [ ] **Step 1: 创建 src/components/Header.tsx**

```tsx
// src/components/Header.tsx
'use client'

import { USAGE_LIMIT } from '@/lib/usage'

export function Header({
  usageCount,
  onDonate,
}: {
  usageCount: number
  onDonate: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-100/60 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-ink">
            🖼️ 设备预览图生成工具
          </h1>
          <p className="text-xs text-ink/50">
            本月已生成 {usageCount} / {USAGE_LIMIT} 张
          </p>
        </div>
        <button
          onClick={onDonate}
          className="rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-card-lg"
        >
          ☕ 打赏支持
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Header.tsx
git commit -m "feat: header with usage counter and donate button"
```

---

### Task 13: 上传区

**Files:**
- Create: `src/components/UploadZone.tsx`

- [ ] **Step 1: 创建 src/components/UploadZone.tsx**

```tsx
// src/components/UploadZone.tsx
'use client'

import { useRef, useState } from 'react'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

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
      <p className="mt-3 font-medium text-ink">点击选择或拖拽多张壁纸到这里</p>
      <p className="mt-1 text-xs text-ink/50">支持 JPG / PNG / WEBP，图片保存在浏览器本地（IndexedDB）</p>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/UploadZone.tsx
git commit -m "feat: drag-and-drop multi-file upload zone"
```

---

### Task 14: 工作台卡片（ImageCard）

**Files:**
- Create: `src/components/ImageCard.tsx`

卡片职责：显示原图缩略 + 5 张设备预览（canvas，scale=1，showTime=true）+ 下载按钮组（全部预览图 / 交付三图 / 原图 / 单张预览悬停下载）。

- [ ] **Step 1: 创建 src/components/ImageCard.tsx**

```tsx
// src/components/ImageCard.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import type { StoredImage } from '@/lib/db'
import { PURE_DEVICES, SELLER_DEVICES } from '@/lib/tokens'
import { downloadBlob } from '@/lib/download'
import { blobToImage, downloadDeviceImage, downloadDeviceSet } from '@/lib/generate'
import { DEVICE_DEFS } from '@/lib/render/devices'
import { renderDeviceImage } from '@/lib/render/canvas'

export function ImageCard({
  image,
  onDelete,
  onGenerated,
}: {
  image: StoredImage
  onDelete: () => void
  onGenerated: () => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const thumbUrl = useMemo(() => URL.createObjectURL(image.blob), [image.blob])
  useEffect(() => () => URL.revokeObjectURL(thumbUrl), [thumbUrl])

  useEffect(() => {
    let cancelled = false
    blobToImage(image.blob)
      .then((i) => { if (!cancelled) setImg(i) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [image.blob])

  // 预览 canvases：每个设备一张，当前时间
  const previews = useMemo(() => {
    if (!img) return []
    const now = new Date()
    return SELLER_DEVICES.map((meta) => {
      const canvas = renderDeviceImage(img, meta.kind, { showTime: true, now, scale: 1 })
      return { meta, url: canvas.toDataURL('image/png') }
    })
  }, [img])

  async function runDownload(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      onGenerated()
    } catch {
      alert('下载失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="rounded-card bg-white p-5 shadow-card">
        <p className="text-sm text-rose-600">「{image.name}」图片读取失败，可能已损坏。</p>
        <button onClick={onDelete} className="mt-3 text-xs text-ink/50 underline">删除记录</button>
      </div>
    )
  }

  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbUrl} alt={image.name} className="h-14 w-14 rounded-lg object-cover" />
          <div>
            <p className="max-w-[16rem] truncate text-sm font-semibold text-ink">{image.name}</p>
            <p className="text-xs text-ink/50">{new Date(image.createdAt).toLocaleString('zh-CN')}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            disabled={busy || !img}
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, SELLER_DEVICES, 'seller', image.name))}
            className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            下载全部预览图（5 张）
          </button>
          <button
            disabled={busy || !img}
            onClick={() => runDownload(() => downloadDeviceSet(image.blob, PURE_DEVICES, 'pure', image.name))}
            className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            下载交付三图（无时间）
          </button>
          <button
            onClick={() => downloadBlob(image.blob, image.name)}
            className="rounded-full border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            下载原图
          </button>
          <button
            onClick={onDelete}
            className="rounded-full px-3 py-1.5 text-xs text-ink/40 transition hover:bg-rose-50 hover:text-rose-600"
          >
            删除
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {previews.map(({ meta, url }) => (
          <figure key={meta.kind} className="group relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${meta.label} 预览`}
              style={{ width: DEVICE_DEFS[meta.kind].width, height: DEVICE_DEFS[meta.kind].height }}
              className="rounded-thumb shadow-card"
            />
            <figcaption className="mt-1.5 text-center text-xs text-ink/60">{meta.label}</figcaption>
            <button
              disabled={busy || !img}
              onClick={() =>
                runDownload(async () => {
                  if (!img) return
                  await downloadDeviceImage(img, meta, 'seller', image.name, true)
                })
              }
              className="absolute inset-x-0 top-0 rounded-thumb bg-ink/55 py-1.5 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-0"
            >
              下载 PNG
            </button>
          </figure>
        ))}
        {!img && <p className="py-10 text-sm text-ink/40">正在加载图片…</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/ImageCard.tsx
git commit -m "feat: image workbench card with device previews and downloads"
```

---

### Task 15: 页面组装（src/app/page.tsx）

**Files:**
- Create: `src/app/page.tsx`

职责：状态管理（图片列表、计数、toast、打赏弹窗）、上传处理（类型校验/入库）、删除、生成计数与提醒判断（页面加载时 + 生成后）。

- [ ] **Step 1: 创建 src/app/page.tsx**

```tsx
// src/app/page.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '@/components/Header'
import { UploadZone } from '@/components/UploadZone'
import { ImageCard } from '@/components/ImageCard'
import { DonateModal } from '@/components/DonateModal'
import { Toasts, type ToastItem } from '@/components/Toasts'
import { addImage, deleteImage, getAllImages, getUsage, markReminderShown, recordGeneration, type StoredImage } from '@/lib/db'
import { shouldRemind } from '@/lib/usage'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export default function Page() {
  const [images, setImages] = useState<StoredImage[]>([])
  const [usageCount, setUsageCount] = useState(0)
  const [donateOpen, setDonateOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  const toast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastId.current
    setToasts((ts) => [...ts, { id, message, tone }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3500)
  }, [])

  const refreshUsage = useCallback(async () => {
    const u = await getUsage()
    setUsageCount(u.month === new Date().toISOString().slice(0, 7) ? u.count : 0)
  }, [])

  // 页面加载：读取图片 + usage；超限且到期则自动弹打赏
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [list, usage] = await Promise.all([getAllImages(), getUsage()])
      if (cancelled) return
      setImages(list)
      setUsageCount(usage.month === new Date().toISOString().slice(0, 7) ? usage.count : 0)
      if (shouldRemind(usage, new Date())) {
        setDonateOpen(true)
        await markReminderShown()
      }
    })().catch(() => toast('本地数据读取失败', 'error'))
    return () => { cancelled = true }
  }, [toast])

  async function handleFiles(files: File[]) {
    const valid = files.filter((f) => ACCEPTED.includes(f.type))
    const rejected = files.length - valid.length
    if (rejected > 0) toast(`${rejected} 个非图片文件已跳过`, 'error')
    for (const file of valid) {
      try {
        await addImage(file.name, file)
      } catch {
        toast(`「${file.name}」保存失败：本地存储空间不足`, 'error')
      }
    }
    setImages(await getAllImages())
    if (valid.length > 0) toast(`已保存 ${valid.length} 张图片`)
  }

  async function handleDelete(image: StoredImage) {
    await deleteImage(image.id)
    setImages(await getAllImages())
    toast(`已删除「${image.name}」`)
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
    <div className="min-h-screen">
      <Header usageCount={usageCount} onDonate={() => setDonateOpen(true)} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <UploadZone onFiles={handleFiles} />
        {images.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink/40">
            还没有图片，先上传几张壁纸吧～
          </p>
        ) : (
          images.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              onDelete={() => handleDelete(img)}
              onGenerated={handleGenerated}
            />
          ))
        )}
      </main>
      <DonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
      <Toasts items={toasts} />
    </div>
  )
}
```

注意：page.tsx 中的月份判断用 `new Date().toISOString().slice(0, 7)`（UTC），与 `monthKey`（本地时区）在月底/月初边界可能差一天。统一改用 `monthKey`：

```tsx
import { monthKey, shouldRemind } from '@/lib/usage'
// 两处 new Date().toISOString().slice(0, 7) 均替换为 monthKey(new Date())
```

- [ ] **Step 2: 提交**

```bash
git add src/app/page.tsx
git commit -m "feat: main page wiring upload, storage, usage and reminders"
```

---

### Task 16: 全量验证

**Files:**
- 无新文件

- [ ] **Step 1: 跑全部测试**

Run: `npm test`
Expected: 全部 PASS（db 5 + usage 5 + time 2 + canvas 4 ≈ 16 个用例）。

- [ ] **Step 2: 生产构建验证静态导出**

Run: `npm run build`
Expected: `✓ Generating static pages` 成功，输出 `out/` 目录。

- [ ] **Step 3: 手动冒烟（开发服务器）**

Run: `npm run dev`，浏览器打开 http://localhost:3000
验证清单：
1. 拖拽 2 张 JPG 上传 → 出现 2 张卡片，刷新页面后仍在（IndexedDB 持久化）
2. 卡片显示 5 张设备预览，均带当前时间（英文「Wednesday, October 6」+ HH:MM）
3. 悬停预览图出现「下载 PNG」，下载文件名 `seller-iphone-<原名>.png`
4. 「下载交付三图」产出 3 个 `pure-*` 文件，画面中无时间
5. 「下载原图」文件名与上传一致
6. 删除卡片后刷新不再出现
7. 点击「☕ 打赏支持」弹窗显示两个占位框（二维码待补充）
8. 上传非图片文件 → toast 提示跳过

- [ ] **Step 4: 提交收尾**

```bash
git add -A
git commit -m "chore: verify full suite and static build"
```

---

## 计划自审记录

- **Spec 覆盖**：上传多图（T13/T15）、IndexedDB 存储（T3）、5 设备预览带当前时间英文格式（T5/T7/T8/T14）、cover 裁剪（drawCover）、无时间交付三图 iPhone/iPad横/MacBook（PURE_DEVICES）、`seller-`/`pure-` 命名（deviceFileName）、下载原图（T14）、15 张/15 天软提醒（T4/T15）、打赏按钮+二维码弹窗+public/donate 占位（T11）、桔色+玫瑰红 tokens（T1/T2）、错误处理（T15 toast + T14 失败占位）。✅
- **类型一致性**：`DeviceKind`/`DeviceMeta`/`Prefix` 在 tokens.ts 定义，devices.ts/canvas.ts/generate.ts/ImageCard.tsx 引用一致；`StoredImage`/`UsageRecord` 仅 db.ts 导出；`shouldRemind(usage, now)` 签名在 usage.ts 定义、db.test.ts 与 page.tsx 使用一致。✅
- **与 spec 的偏差**：EXPORT_SCALE=4（spec 描述为"2 倍/1290×2796 级别"，实际 iPhone 导出 656×1416，清晰度足够且内存可控，已在文件结构处注明）。
