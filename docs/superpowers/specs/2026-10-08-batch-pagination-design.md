# 分页 + 整宽卡片 + 批量操作设计

> 日期：2026-10-08。延续 `2026-10-06-ui-overhaul-design.md`（shadcn 全面采用、暗色主题、i18n）。

## 背景与目标

图片多时出现四个体验问题：

1. 全部卡片一次性渲染，页面过长 → **分页展示**（每页 6 张）。
2. 多列 masonry 中卡片宽度受列约束 → 改为**单列整宽卡片**，卡片宽 = 容器宽（`max-w-6xl`），设备预览图在卡内 `flex-wrap` 瀑布换行（不变）。
3. 逐张下载效率低、多文件下载被浏览器拦截 → 顶部**一键下载全部**，打包成**单个 ZIP**。
4. 删除只能逐张 → 卡片 checkbox **多选** + 工具栏**全选本页 / 下载选中 ZIP / 删除选中**。

## 确认过的决策（AskUserQuestion）

- 卡片布局：**单列整宽**（放弃多列瀑布流）。
- 每页数量：**固定 6 张**（不做用户切换器）。
- 下载内容：**全部打包 ZIP** —— 每张壁纸的卖家 5 图 + 纯交付 3 图，按壁纸名分文件夹。

## 架构

### 新增依赖

- `jszip@3.10.2`（已安装，npmmirror）—— 浏览器端打包 ZIP。

### 新文件

| 文件 | 职责 |
|---|---|
| `src/lib/pagination.ts` | `paginate<T>(items, page, pageSize)` 纯函数：返回安全页码、总页数、当前页切片。单测覆盖越界、空列表、精确整除。 |
| `src/lib/batch.ts` | `buildZipBlob(images, onProgress?)`：逐张壁纸渲染 seller 5 + pure 3，生成 `壁纸名/seller-<tag>-<base>.png` 结构，返回 ZIP Blob。文件名逻辑抽成纯函数 `zipEntryName(prefix, tag, originalName, folderName)` 便于单测（非法文件系统字符清洗）。 |
| `src/components/ui/checkbox.tsx` | shadcn 风格 checkbox，基于 `@radix-ui/react-checkbox` + lucide `Check` 图标。 |
| `src/components/SelectionToolbar.tsx` | 上传区下方工具栏：全选本页 checkbox、已选 N 项、下载选中 ZIP、删除选中（AlertDialog 确认）。无选中时操作按钮 disabled。 |
| `src/components/PaginationBar.tsx` | 底部居中：上一页 / 页码（当前页高亮）/ 下一页。页数 > 1 才渲染。 |

### 修改文件

| 文件 | 变更 |
|---|---|
| `src/app/page.tsx` | 分页状态（`page`, setPage 时 clamp）、选择状态（`Set<string>` 存 image.id，仅当前页）、批量删除（循环 `deleteImage` + 清除已选）、下载全部/下载选中的 ZIP 流程（busy 状态 + sonner 进度 toast）、布局从 `columns-*` 改为单列 `space-y-6`。删除/上传后重算页码。 |
| `src/components/ImageCard.tsx` | 新增 props：`selected: boolean`, `onSelectChange: (v: boolean) => void`。卡片头部加 checkbox（缩略图左侧）。 |
| `src/components/Header.tsx` | 新增「下载全部」按钮：onClick 触发 ZIP（所有壁纸），busy 时 disabled + spinner 文案。接收 `onDownloadAll`、`downloadAllBusy` props。 |
| `src/lib/generate.ts` | 抽出 `renderDeviceBlob(img, meta, prefix, originalName, showTime): Promise<Blob>`（渲染 + canvasToBlob，不下载），`downloadDeviceImage` 改为基于它实现。 |
| `src/lib/i18n/zh.ts` / `en.ts` | 新增词条（见下）。 |
| `package.json` | jszip 依赖（已完成）。 |

### 选择状态语义

- 选择范围 = **当前页**；翻页时清空选择（简单、可预期）。
- 「全选」= 全选本页 6 张；半选状态用 Radix checkbox 的 `checked="indeterminate"`。
- 批量删除走 AlertDialog 二次确认（复用 `confirmDelete` 风格，新增 `confirmDeleteBatch` 词条：「确定删除选中的 {count} 张图片吗？」）。

### 下载语义与 usage 计数

- Header「下载全部」：所有壁纸（忽略选择）→ 一个 ZIP。
- 工具栏「下载选中」：仅选中壁纸 → 一个 ZIP。
- 一次 ZIP 下载（无论包含多少张图）计 **1 次** usage，避免频繁弹打赏。
- ZIP 生成期间按钮 busy，sonner 显示「打包中…」进度（`{done}/{total}`），完成 toast.success，失败 toast.error。
- 单图下载（卡片内）维持现状：每张计 1 次。

### ZIP 结构

```
mockups-<YYYYMMDD-HHmmss>.zip
└── <壁纸名去扩展名>/          # 非法字符替换为 -
    ├── seller-iphone-<base>.png
    ├── ...（5 张）
    └── pure-*.png             # 3 张
```

壁纸名冲突（同名不同 id）按 id 后缀区分：`<base>-<id前6位>`。生成失败的单张跳过并继续，结束后 toast 提示跳过数量。

### 分页行为

- `paginate`：page 越界（如删除后末页被清空）自动 clamp 到最后一页。
- 上传新图后跳回第 1 页（新图在列表顶部）。
- 页码条仅当 `pageCount > 1` 渲染；显示当前页 / 总页数。

### i18n 新增词条

```
header.downloadAll: '下载全部 ZIP' / 'Download all (ZIP)'
toolbar.selected: '已选 {count} 项' / '{count} selected'
toolbar.selectPage: '全选本页' / 'Select this page'
toolbar.downloadSelected: '下载选中 ZIP' / 'Download selected (ZIP)'
toolbar.deleteSelected: '删除选中' / 'Delete selected'
pagination.prev: '上一页' / 'Prev'
pagination.next: '下一页' / 'Next'
pagination.page: '第 {page} / {total} 页' / 'Page {page} / {total}'
toast.zipping: '正在打包 {done}/{total}…' / 'Zipping {done}/{total}…'
toast.zipDone: 'ZIP 已生成，开始下载' / 'ZIP ready, downloading'
toast.zipFailed: '打包失败，请重试' / 'Zipping failed, please retry'
toast.zipSkipped: '{count} 张生成失败已跳过' / '{count} image(s) skipped'
toast.batchDeleted: '已删除 {count} 张图片' / 'Deleted {count} image(s)'
confirmDeleteBatch.title: '删除图片' / 'Delete images'
confirmDeleteBatch.description: '确定删除选中的 {count} 张图片吗？此操作不可恢复。' / ...
```

## 错误处理

- ZIP 打包中单张失败不中断整体；记录跳过数，完成时提示。
- 空列表时 Header 下载全部 / 工具栏均不可触发（disabled 或不渲染工具栏）。
- 批量删除部分失败：已删的照常移除并提示失败数。

## 测试

- `pagination.test.ts`：正常切片、page 越界 clamp、空列表、整除边界。
- `batch.test.ts`：`zipEntryName`（非法字符、同名冲突、扩展名剥离）；`zipFolderName`。
- i18n 现有测试自动覆盖新词条完整性（en 与 zh 结构一致）。

## 非目标（YAGNI）

- 不做跨页保留选中、不做每页数量切换器、不做 ZIP 内缩略图预览、不迁移旧数据。
