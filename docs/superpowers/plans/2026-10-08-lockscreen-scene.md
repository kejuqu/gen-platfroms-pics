# 写实锁屏 + 主色场景 + 交付原图 实施计划

> Spec: `docs/superpowers/specs/2026-10-08-lockscreen-scene-design.md` (be8cc33)。执行方式：subagent-driven（haiku implementer + 双阶段 review），dev server 常驻（任务 bg30v82ce，:3000），**绝不 `pnpm build`**（最终验证任务里先停再 build 再重启）。

## Task 1: 主色提取 `src/lib/render/color.ts` + 单测

**Files:** Create `src/lib/render/color.ts`, Test `src/lib/render/__tests__/color.test.ts`（TDD：先写测试确认红，再实现）。

```ts
export type RGB = [number, number, number]
export interface GradientStops { from: RGB; to: RGB }

/** 区域平均色：像素区间 [startPixel, startPixel+pixelCount)，alpha<128 跳过；无有效像素回退 [128,128,128] */
export function averageColor(data: Uint8ClampedArray, startPixel: number, pixelCount: number): RGB {
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < pixelCount; i++) {
    const o = (startPixel + i) * 4
    if (o + 3 >= data.length) break
    if (data[o + 3] < 128) continue
    r += data[o]; g += data[o + 1]; b += data[o + 2]; n++
  }
  if (n === 0) return [128, 128, 128]
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}

const mix = (c: RGB, t: RGB, k: number): RGB => [
  Math.round(c[0] + (t[0] - c[0]) * k),
  Math.round(c[1] + (t[1] - c[1]) * k),
  Math.round(c[2] + (t[2] - c[2]) * k),
]

/** 左区微提亮、右区微压深 */
export function gradientStops(left: RGB, right: RGB): GradientStops {
  return { from: mix(left, [0, 0, 0], 0.28), to: mix(right, [255, 255, 255], 0.42) }
}

/** 浏览器端：cover 采样 48×48 → 左半/右半平均 → gradientStops */
export function extractGradientStops(img: HTMLImageElement): GradientStops {
  const S = 48
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx || !img.naturalWidth) return { from: [128, 128, 128], to: [220, 220, 220] }
  const s = Math.max(S / img.naturalWidth, S / img.naturalHeight)
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s
  ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh)
  const { data } = ctx.getImageData(0, 0, S, S)
  const half = S * S / 2
  return gradientStops(averageColor(data, 0, half), averageColor(data, half, half))
}
```

测试（vitest，中文 it 描述，风格同 `src/lib/__tests__/pagination.test.ts`）：
1. averageColor 已知数组：2 像素 [255,0,0,255] + [0,0,255,255] → [128,0,128]。
2. alpha<128 像素被跳过。
3. 全透明区间回退 [128,128,128]。
4. gradientStops：left [100,150,200] → from = [72,108,144]（mix black 0.28：round(100*0.72)=72 等）；right [10,20,30] → to = mix white 0.42：[round(10+245*0.42)=113, round(20+235*0.42)=119, round(30+225*0.42)=125]。
5. extractGradientStops 不测试（需 canvas，jsdom 无）。

Commit: `feat(render): dominant-color extraction with gradient stops + tests`

## Task 2: 完整锁屏 `drawLockScreen`（canvas.ts）+ 测试更新

**Files:** Modify `src/lib/render/canvas.ts`, Modify `src/lib/render/__tests__/canvas.test.ts`

1. 把 `drawClock` 替换为 `drawLockScreen(ctx, def, now)`：
   - 常量：`const { x, y, w, h } = def.screen; const timeFont = Math.max(12, Math.round(h * 0.085)); const dateFont = Math.max(8, Math.round(timeFont * 0.36))`
   - 通用：白色、居中、`shadowColor rgba(0,0,0,0.35)` blur 6；日期在 `y + h*0.13`，时间在其下 `timeFont*0.95`（日期 dateFont，时间 `700 ${timeFont}px`）。
   - iPhone（`def.kind === 'iphone'`）追加：
     - 状态栏高 `barH = Math.max(14, Math.round(h * 0.05))`，白色。左侧：小时间 `formatLockTime(now)`，font `${Math.round(barH*0.55)}px`，位置 `(x + w*0.09, y + barH/2)`，textAlign left。
     - 右侧（基线 cy = y + barH/2，右缘 rx = x + w - w*0.06，图标高 iconH = barH*0.42）：电池（宽 w*0.11 高 iconH 圆角框 1.5px 描边 + 内部填充 w*0.11*0.75 同色实心 + 正极小帽）、WiFi（圆点 + 两条弧 `ctx.arc`）、信号（4 根宽 2.5px 递增高圆角竖条 `fillRect`）。从右往左排：电池最右，WiFi 中，信号最左，间距 iconH*0.5。
     - 底部玻璃钮：半径 `r = h*0.045`，圆心 `(x + w*0.25, y + h*0.9)` 和 `(x + w*0.75, y + h*0.9)`，`fillStyle rgba(255,255,255,0.28)` 圆；内嵌白色 55% 简笔图标——手电筒：圆角小竖胶囊（宽 r*0.5 高 r*0.9 圆角 r*0.25）；相机：圆角方（边 r*0.95 圆角 r*0.22）+ 内圆镜头（半径 r*0.26）+ 顶部小凸点。
     - home 指示条：`y + h*0.975`，宽 w*0.4 高 max(2.5, h*0.008) 圆角，rgba(255,255,255,0.85)。
   - paintDevice 中 `if (opts.showTime) drawClock(...)` 改为 `drawLockScreen(...)`。
2. 更新 canvas.test.ts：
   - stub ctx 增加 `translate: () => {}`（防后续任务踩坑，本任务若不用可不加）、保持其余不变；如需 `rect`/`quadraticCurveTo` 则补 no-op。
   - `paintDevice iphone showTime=true` 断言 `fillText` = **3**（日期+时间+状态栏小时间；若信号/WiFi 实现额外用了 fillText 就相应调整并注释说明）。
   - `paintDevice macbook showTime=true` 断言 = **2**；`showTime=false` 保持 **0**。
   - 其余用例不动。
3. `pnpm exec tsc --noEmit && pnpm test` 全绿。

Commit: `feat(render): realistic lockscreen with status bar and home buttons`

## Task 3: 场景画布 `renderSellerScene` + 预览接线

**Files:** Modify `src/lib/render/devices.ts`, `src/lib/render/canvas.ts`, `src/components/ImageCard.tsx`

1. `devices.ts` 末尾追加：
```ts
/** 场景画布尺寸：设备 + 四周留白（14%，min 24） */
export function sceneDims(def: DeviceDef): { width: number; height: number } {
  const padX = Math.max(24, Math.round(def.width * 0.14))
  const padY = Math.max(24, Math.round(def.height * 0.14))
  return { width: def.width + padX * 2, height: def.height + padY * 2 }
}
/** 供 canvas.ts 内部使用 */
export function scenePadding(def: DeviceDef): { padX: number; padY: number } {
  const padX = Math.max(24, Math.round(def.width * 0.14))
  const padY = Math.max(24, Math.round(def.height * 0.14))
  return { padX, padY }
}
```
2. `canvas.ts`：
   - `RenderOptions` 增加 `backdrop?: GradientStops`（import type from './color'）。
   - 新增：
```ts
/** 场景化卖家预览：主色渐变背景 + 投影 + 居中设备 */
export function renderSellerScene(
  img: HTMLImageElement,
  kind: DeviceKind,
  opts: RenderOptions & { backdrop: GradientStops },
): HTMLCanvasElement {
  const def = DEVICE_DEFS[kind]
  const scale = opts.scale ?? 1
  const { padX, padY } = scenePadding(def)
  const dims = sceneDims(def)
  const canvas = document.createElement('canvas')
  canvas.width = dims.width * scale
  canvas.height = dims.height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.save()
  ctx.scale(scale, scale)
  const grad = ctx.createLinearGradient(0, 0, dims.width, dims.height)
  grad.addColorStop(0, `rgb(${opts.backdrop.from.join(',')})`)
  grad.addColorStop(1, `rgb(${opts.backdrop.to.join(',')})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, dims.width, dims.height)
  ctx.restore()

  ctx.save()
  ctx.scale(scale, scale)
  const offY = Math.max(4, Math.round(def.height * 0.015))
  ctx.translate(padX, padY + offY)
  ctx.shadowColor = 'rgba(15,15,20,0.4)'
  ctx.shadowBlur = Math.round(def.width * 0.05)
  ctx.shadowOffsetY = Math.round(offY * 0.6)
  paintDevice(ctx, def, img, { ...opts, scale: 1 }, 1)
  ctx.restore()
  return canvas
}
```
   - `renderDeviceImage` 原样保留。
3. `ImageCard.tsx` 预览 useMemo：`const backdrop = extractGradientStops(img)` 一次，map 内 `renderSellerScene(img, meta.kind, { showTime: true, now, backdrop })`（scale 不传=1）。`toDataURL` 不变。
4. ImageCard 预览 figure/占位尺寸：`DEVICE_DEFS[p.kindKey].width/height` → `sceneDims(DEVICE_DEFS[p.kindKey]).width/height`（含 err 占位与 ok figure 的 style）。
5. tsc + test 全绿（canvas.test.ts 新增 renderSellerScene 尺寸用例可选：stub 需支持 setTransform/translate/shadow 赋值——**本任务不强加新用例**，避免 stub 膨胀；尺寸逻辑由 e2e 截图验证）。

Commit: `feat(render): dominant-color scene canvas behind device previews`

## Task 4: 交付图 = 原图直出（tokens/generate/batch/ImageCard/i18n）

**Files:** Modify `src/lib/tokens.ts`, `src/lib/generate.ts`, `src/lib/batch.ts`, `src/components/ImageCard.tsx`, `src/lib/i18n/zh.ts`, `src/lib/i18n/en.ts`

1. `tokens.ts`：删 `PURE_DEVICES`、`Prefix`；`deviceFileName(prefix, tag, originalName)` → `deviceFileName(tag: string, originalName: string)`，返回 `seller-${tag}-${base}.png`。
2. `generate.ts`：
   - `renderDeviceBlob(img, meta, prefix, originalName, showTime)` → `renderSellerBlob(img: HTMLImageElement, meta: DeviceMeta, originalName: string): Promise<Blob>`：`const backdrop = extractGradientStops(img)`；`renderSellerScene(img, meta.kind, { showTime: true, now: new Date(), backdrop, scale: EXPORT_SCALE })` → `canvasToBlob`。
   - `downloadDeviceImage(img, meta, prefix, originalName, showTime)` → `(img, meta, originalName)`：内部 `renderSellerBlob` + `downloadBlob(blob, deviceFileName(meta.tag, originalName))`。
   - `downloadDeviceSet(blob, devices, prefix, originalName)` → `(blob, devices, originalName)`；循环 `downloadDeviceImage(img, devices[i], originalName)`，间隔 300ms 保留。
3. `batch.ts`：
   - 删 PURE_DEVICES/Prefix 相关；`zipEntryName(tag, originalName, folder)`（seller 硬编码）。
   - `buildZipBlob`：每图 decode 一次后 5 张 `renderSellerBlob`；外加 `zip.file(`${folder}/${image.name.replace(/[\\/]/g, '_')}`, image.blob)` 原图直出。
4. `ImageCard.tsx`：
   - 删 pure-set Button 与 original Button；新增交付 Button（放原 pure 位置）：`<Button size="sm" variant="secondary" disabled={busy || !ready} className="rounded-full bg-rose-500 text-white hover:bg-rose-600" onClick={() => runDownload(async () => { downloadBlob(image.blob, image.name) })}>{t('card.deliver')}</Button>`（样式沿用原 pure 按钮）。
   - 「下载全部预览图」onClick：`downloadDeviceSet(image.blob, SELLER_DEVICES, image.name)`（去 prefix）；单张预览下载 `downloadDeviceImage(img, meta, image.name, true)` → `(img, meta, image.name)`。
   - 删 PURE_DEVICES import；保留 downloadBlob import。
5. i18n：zh `card.deliver: '下载交付图'` 新增，`card.pureSet`、`card.original` 删除；en `deliver: 'Download delivery image'` 新增，两键同步删除。`card.sellerSet` 不动。
6. 全局搜 `PURE_DEVICES`/`Prefix`/`pureSet`/`card.original`/`renderDeviceBlob` 确认无残留引用；`pnpm exec tsc --noEmit && pnpm test` 全绿（i18n 结构测试自动覆盖删键后 parity）。

Commit: `feat(card): deliver raw wallpaper image; drop pure device renders`

## Task 5: e2e 验证 + 收尾

1. `pnpm test` 全绿（45+ 新用例）。
2. TaskStop bg30v82ce → `pnpm build` → 后台重启 dev server。
3. chrome-devtools 桌面截图：agent.png 卡片预览应有——主色渐变背景（agent.png 是紫粉色霓虹 → 紫/粉渐变）、iPhone 完整锁屏（状态栏/大时钟/底部双钮/home 条）、设备投影；与参考图风格对齐。
4. 下载单张卖家 PNG + 交付图验证：卖家图=大图带场景，交付图=原文件字节（大小与 IndexedDB blob 一致）。
5. ZIP（下载全部）：每文件夹 5 张 seller + 1 个原图文件，无 pure-*。
6. 390×844 移动视口截图无溢出。
7. 清理测试下载文件；最终状态报告。

## 复用清单

- `paintDevice`/`drawCover`/`roundedRectPath` → canvas.ts（Task 2/3 在其上扩展，不改签名）
- `formatLockDate`/`formatLockTime` → src/lib/time.ts
- `averageColor`/`gradientStops`/`extractGradientStops` → color.ts（Task 1）
- `sceneDims`/`scenePadding`/`DEVICE_DEFS` → devices.ts
- `canvasToBlob`/`downloadBlob` → src/lib/download.ts
- `runDownload`/`previews` useMemo 结构 → ImageCard.tsx
- `blobToImage` → generate.ts
