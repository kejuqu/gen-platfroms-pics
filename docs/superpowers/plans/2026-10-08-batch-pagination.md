# 分页 + 整宽卡片 + 批量操作 实施计划

## Context

图片数量变多后出现四个体验问题，用户反馈并确认了解决方向（spec 已提交：`docs/superpowers/specs/2026-10-08-batch-pagination-design.md`，commit 52f6e96）：

1. 一次性渲染全部卡片 → **分页**（每页 6 张）
2. masonry 列宽受限 → **单列整宽卡片**（卡片宽 = 容器宽，预览图卡内 flex-wrap 不变）
3. 逐张下载被浏览器拦截 → 顶部**一键下载全部**，打包单个 **ZIP**（jszip 3.10.2 已安装）
4. 逐张删除 → checkbox **多选 + 全选本页 + 批量删除 + 下载选中 ZIP**

## 实施方式

subagent-driven（沿用上一轮用户选择）：每个 task 派发独立 implementer（haiku）→ spec review（haiku）→ quality review（haiku）。执行期间 dev server 在跑（任务 bl1o00z0g，端口 3000）；**绝不运行 `pnpm build`**（会清掉 `.next` 导致 dev 404）；最终验证时先 TaskStop 再 build，验完重启。

## Task 1: 分页纯函数 + 单测

**Files:**
- Create: `src/lib/pagination.ts`
- Test: `src/lib/__tests__/pagination.test.ts`

```ts
// src/lib/pagination.ts
export interface PageResult<T> {
  pageItems: T[]
  pageCount: number
  safePage: number // 1-based, clamped
}

export function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  return {
    pageItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    pageCount,
    safePage,
  }
}
```

测试：正常切片（10 项 size 6 → 第 1 页 6 项、第 2 页 4 项）；page 越界 clamp（page 99 → 末页）；空列表（pageCount 1、pageItems []）；整除边界。

Commit: `feat(lib): paginate() with clamping + tests`

## Task 2: 批量 ZIP 模块 + 单测

**Files:**
- Modify: `src/lib/generate.ts`（抽出 `renderDeviceBlob`，`downloadDeviceImage` 复用）
- Create: `src/lib/batch.ts`
- Test: `src/lib/__tests__/batch.test.ts`

`generate.ts` 变更：
```ts
/** 渲染单张设备图为 Blob（不下载），供单张与 ZIP 批量共用 */
export async function renderDeviceBlob(
  img: HTMLImageElement,
  meta: DeviceMeta,
  prefix: Prefix,
  originalName: string,
  showTime: boolean,
): Promise<Blob> {
  const canvas = renderDeviceImage(img, meta.kind, { showTime, now: new Date(), scale: EXPORT_SCALE })
  return canvasToBlob(canvas)
}
```
`downloadDeviceImage` 改为 `downloadBlob(await renderDeviceBlob(...), deviceFileName(...))`。

`src/lib/batch.ts`：
```ts
import JSZip from 'jszip'
import type { StoredImage } from './db'
import { PURE_DEVICES, SELLER_DEVICES, type Prefix } from './tokens'
import { blobToImage, renderDeviceBlob } from './generate'

/** 文件夹名：剥离扩展名 + 非法字符清洗；重名时追加 id 前 6 位 */
export function zipFolderName(image: StoredImage, taken: Set<string>): string {
  const base = image.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|-]/g, '_').trim() || 'image'
  let name = base
  if (taken.has(name.toLowerCase())) name = `${base}-${image.id.slice(0, 6)}`
  taken.add(name.toLowerCase())
  return name
}

export function zipEntryName(prefix: Prefix, tag: string, originalName: string, folder: string): string {
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|-]/g, '_')
  return `${folder}/${prefix}-${tag}-${base}.png`
}

export interface ZipProgress { done: number; total: number; skipped: number }

/**
 * 把所有壁纸的 seller 5 + pure 3 打成 ZIP。单张失败跳过并计入 skipped。
 * onProgress 每次完成一张回调一次。
 */
export async function buildZipBlob(
  images: StoredImage[],
  onProgress?: (p: ZipProgress) => void,
): Promise<{ blob: Blob; skipped: number }> {
  const zip = new JSZip()
  const taken = new Set<string>()
  const folders = new Map<string, string>() // id -> folder
  let done = 0
  let skipped = 0
  const total = images.length
  for (const image of images) {
    const folder = zipFolderName(image, taken)
    folders.set(image.id, folder)
    try {
      const img = await blobToImage(image.blob)
      for (const meta of SELLER_DEVICES) {
        zip.file(zipEntryName('seller', meta.tag, image.name, folder),
          await renderDeviceBlob(img, meta, 'seller', image.name, true))
      }
      for (const meta of PURE_DEVICES) {
        zip.file(zipEntryName('pure', meta.tag, image.name, folder),
          await renderDeviceBlob(img, meta, 'pure', image.name, false))
      }
    } catch {
      skipped += 1
    }
    done += 1
    onProgress?.({ done, total, skipped })
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, skipped }
}

/** ZIP 下载文件名：mockups-YYYYMMDD-HHmmss.zip */
export function zipFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `mockups-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.zip`
}
```

测试（`zipFolderName` / `zipEntryName` / `zipFileName` 纯函数）：扩展名剥离；非法字符 `\ / : * ? " < > |` 替换为 `_`；同名第二张追加 `-<id6>`；zipFileName 格式正则 `^mockups-\d{8}-\d{6}\.zip$`。

Commit: `feat(lib): batch ZIP builder with folder-per-wallpaper + tests`

## Task 3: i18n 词条

**Files:**
- Modify: `src/lib/i18n/zh.ts`, `src/lib/i18n/en.ts`

zh 追加（en 同步，结构与 Dictionary 类型对齐，现有 i18n 测试会自动校验完整性）：

```ts
header: { ..., downloadAll: '下载全部 ZIP' },
toolbar: {
  selectPage: '全选本页',
  selected: '已选 {count} 项',
  downloadSelected: '下载选中 ZIP',
  deleteSelected: '删除选中',
},
pagination: { prev: '上一页', next: '下一页', page: '第 {page} / {total} 页' },
toast: { ...,
  zipping: '正在打包 {done}/{total}…',
  zipDone: 'ZIP 已生成，开始下载',
  zipFailed: '打包失败，请重试',
  zipSkipped: '{count} 张生成失败已跳过',
  batchDeleted: '已删除 {count} 张图片',
  batchDeleteFailed: '{count} 张删除失败',
},
confirmDeleteBatch: {
  title: '删除图片',
  description: '确定删除选中的 {count} 张图片吗？此操作不可恢复。',
  cancel: '取消',
  confirm: '确认删除',
},
```

en：`downloadAll: 'Download all (ZIP)'`、`selectPage: 'Select this page'`、`selected: '{count} selected'`、`downloadSelected: 'Download selected (ZIP)'`、`deleteSelected: 'Delete selected'`、`prev: 'Prev'`、`next: 'Next'`、`page: 'Page {page} / {total}'`、`zipping: 'Zipping {done}/{total}…'`、`zipDone: 'ZIP ready, downloading'`、`zipFailed: 'Zipping failed, please retry'`、`zipSkipped: '{count} image(s) skipped'`、`batchDeleted: 'Deleted {count} image(s)'`、`batchDeleteFailed: 'Failed to delete {count} image(s)'`、batch 确认文案英文对应。

跑 `pnpm test` 确认 i18n 用例全绿。Commit: `feat(i18n): pagination/toolbar/zip batch strings (zh+en)`

## Task 4: ui/checkbox + PaginationBar + SelectionToolbar 组件

**Files:**
- Create: `src/components/ui/checkbox.tsx`（需 `pnpm add @radix-ui/react-checkbox --registry=https://registry.npmmirror.com`，可并入本任务）
- Create: `src/components/PaginationBar.tsx`
- Create: `src/components/SelectionToolbar.tsx`

`ui/checkbox.tsx` 按现有 shadcn 组件风格（参考 `src/components/ui/button.tsx` 的 cn/cva 用法）：

```tsx
'use client'
import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName
export { Checkbox }
```

`PaginationBar.tsx`（props: `page`, `pageCount`, `onChange`）：
- `pageCount <= 1` 返回 null。
- 居中一行：上一页 Button(variant=outline,size=sm, disabled=page<=1) → `t('pagination.page', {page, total: pageCount})` → 下一页(disabled=page>=pageCount)。移动端文字用 `pagination.prev/next` 文案 + 页码文本，`sm:` 以上同。简单起见直接用文字按钮三件套。

`SelectionToolbar.tsx`（props: `totalOnPage`, `selectedCount`, `allChecked: boolean`, `indeterminate`, `onToggleAll`, `onDownloadSelected`, `onDeleteSelected`, `busy`）：
- `selectedCount === 0` 且组件仍渲染（totalOnPage>0 时）。
- 布局：`flex flex-wrap items-center gap-3 rounded-card bg-card px-4 py-3`。
- 左侧：Checkbox(checked=allChecked 或 indeterminate → Radix 传 `checked={indeterminate ? 'indeterminate' : allChecked}`) + `t('toolbar.selectPage')` + `t('toolbar.selected', {count})`。
- 右侧：下载选中 Button(size=sm, disabled=selectedCount===0||busy, onClick=onDownloadSelected) + 删除选中 DeleteImageButton 同款 AlertDialog 二次确认（用 `confirmDeleteBatch` 词条，count=selectedCount，确认后 onDeleteSelected）。删除按钮样式沿用 DeleteImageButton 的 destructive 小按钮风格。
- 组件内部自包 AlertDialog（模式参考 `src/components/DeleteImageButton.tsx`）。

Commit: `feat(ui): checkbox primitive, PaginationBar, SelectionToolbar`

## Task 5: page.tsx 接线（分页 + 选择 + 下载全部/选中）

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/ImageCard.tsx`（加 checkbox props）
- Modify: `src/components/Header.tsx`（加下载全部按钮）

`page.tsx` 变更要点：

```tsx
const PAGE_SIZE = 6
const [page, setPage] = useState(1)
const [selected, setSelected] = useState<Set<string>>(new Set())
const [zipBusy, setZipBusy] = useState(false)

const { pageItems, pageCount, safePage } = useMemo(() => paginate(images, page, PAGE_SIZE), [images, page])
// safePage 回写：useEffect(() => { if (safePage !== page) setPage(safePage) }, [safePage, page])

// 翻页清空选择：useEffect(() => { setSelected(new Set()) }, [safePage])
```

- 布局：`columns-*` 外层 div 换成 `mt-6 space-y-6`；每卡片直接 `<ImageCard key={img.id} image={img} selected={selected.has(img.id)} onSelectChange={(v) => setSelected(prev => { const n = new Set(prev); v ? n.add(img.id) : n.delete(img.id); return n })} onDelete={() => handleDelete(img)} onGenerated={handleGenerated} />`。
- 卡片列表下方 `<PaginationBar page={safePage} pageCount={pageCount} onChange={setPage} />`；上传区与列表之间 `<SelectionToolbar ... />`（totalOnPage=pageItems.length）。
- 删除处理：`handleDelete` 不变；新增 `handleBatchDelete`：
```tsx
async function handleBatchDelete() {
  const ids = [...selected]
  let failed = 0
  for (const id of ids) {
    try { await deleteImage(id) } catch { failed += 1 }
  }
  setSelected(new Set())
  setImages(await getAllImages()) // 页码由 safePage 自动 clamp
  toast.success(failed ? t('toast.batchDeleteFailed', { count: failed }) : t('toast.batchDeleted', { count: ids.length }))
}
```
- ZIP 流程（下载全部 / 下载选中共用）：
```tsx
async function handleZip(targets: StoredImage[]) {
  if (zipBusy || targets.length === 0) return
  setZipBusy(true)
  const toastId = toast.loading(t('toast.zipping', { done: 0, total: targets.length }))
  try {
    const { blob, skipped } = await buildZipBlob(targets, ({ done, total }) =>
      toast.loading(t('toast.zipping', { done, total }), { id: toastId }))
    downloadBlob(blob, zipFileName())
    toast.success(skipped > 0 ? t('toast.zipSkipped', { count: skipped }) : t('toast.zipDone'), { id: toastId })
    await handleGenerated() // 一次 ZIP 计 1 次 usage
  } catch {
    toast.error(t('toast.zipFailed'), { id: toastId })
  } finally {
    setZipBusy(false)
  }
}
```
- `handleFiles` 成功后 `setPage(1)`。
- Header：`<Header usageCount={usageCount} onDonate={...} onDownloadAll={() => handleZip(images)} downloadAllDisabled={zipBusy || images.length === 0} downloadAllBusy={zipBusy} />`。

`ImageCard.tsx`：props 加 `selected: boolean`、`onSelectChange: (v: boolean) => void`；卡片头部缩略图左侧插入 `<Checkbox checked={selected} onCheckedChange={(v) => onSelectChange(v === true)} aria-label={...} />`（放在 `flex min-w-0 items-center gap-3` 最前）。

`Header.tsx`：props 加 `onDownloadAll`, `downloadAllDisabled`, `downloadAllBusy`；在语言切换 pill 之前插入下载全部 Button（size=sm, variant=outline, rounded-full, disabled=downloadAllDisabled，busy 时 children 换 `t('toast.zipping', {done:'…', total:''})`—— 简单起见 busy 时用 `⏳` 前缀 + 原文案）。三个头部控件在 390px 宽度下会挤：title 已 truncate、usage 行 `hidden sm:block`，下载全部按钮加 `shrink-0`，语言 pill `shrink-0`，打赏 `shrink-0`——必要时下载全部在移动端只显示图标？保持简单：按钮文案 `t('header.downloadAll')`，依赖 `truncate` + `min-w-0` 让标题收缩，390px 实测若溢出再把语言 pill 改图标（验收时检查）。

Commit: `feat(page): pagination, multi-select, download-all/selected ZIP`

## Task 6: 端到端验证 + 提交收尾

1. `pnpm test`（32 + 新用例全绿）。
2. TaskStop dev server (bl1o00z0g) → `pnpm build` → 重启 dev server（后台）。
3. chrome-devtools：桌面 + 390×844 移动视口截图验证：
   - 单列整宽卡片、每页 6 张、分页条正常翻页；
   - checkbox 多选 → 工具栏计数、全选/半选、批量删除确认框；
   - Header 下载全部 → 小数据量下 ZIP 触发下载（network 面板看到 .zip 200）。
4. 发现问题修掉后，最终 commit（如需要）：`feat: e2e verification fixes`。

## 复用清单（不要重写）

- `paginate` → `src/lib/pagination.ts`（新）
- `buildZipBlob` / `zipFileName` / `zipFolderName` / `zipEntryName` → `src/lib/batch.ts`（新）
- `renderDeviceBlob`（Task 2 从 `downloadDeviceImage` 抽出）→ `src/lib/generate.ts`
- `downloadBlob` → `src/lib/download.ts`（ZIP 与单张共用下载入口）
- `deviceFileName`、`SELLER_DEVICES`、`PURE_DEVICES` → `src/lib/tokens.ts`
- `renderDeviceImage`、`EXPORT_SCALE` → `src/lib/render/canvas.ts`
- `deleteImage`、`getAllImages`、`recordGeneration`、`shouldRemind` → `src/lib/db.ts` / `src/lib/usage.ts`
- AlertDialog 二次确认模式 → `src/components/DeleteImageButton.tsx`
- shadcn 组件风格（cn/cva/Radix）→ `src/components/ui/button.tsx`
- i18n `t()` 插值 → `src/lib/i18n/context`
