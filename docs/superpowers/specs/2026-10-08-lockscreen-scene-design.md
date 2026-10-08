# 写实锁屏预览 + 主色场景背景 + 交付图原图直出

> 日期：2026-10-08。延续 `2026-10-08-batch-pagination-design.md`。

## 背景与目标

用户反馈（附 4 张参考图，MOFA CUD 风格壁纸售卖预览）：

1. **交付图是纯图片，没有时间文案** → 进一步明确：交付图 = **原始壁纸文件直出，连设备框都没有**。
2. **卖家预览图需要场景化展示效果**：像参考图那样——设备悬浮在大画布上，背景色取自壁纸主色；屏幕显示写实锁屏界面（状态栏、日期、大时钟等）。

## 确认过的决策（AskUserQuestion + 用户自定义）

- 交付图 = 无设备框的原图（用户自定义答案「交付图没有设备框」）。
- 卖家预览画布 = 设备居中 + 主色渐变背景 + 柔和投影（平面精修风，非 3D 写实）。
- 锁屏界面 = 完整版（状态栏/灵动岛/日期大时钟/底部按钮/home 条）。

## 变更设计

### 1. 交付图 = 原图直出

- ImageCard 按钮：「下载交付三图（无时间）」+「下载原图」合并为单个「下载交付图」= `downloadBlob(image.blob, image.name)`（原始字节，无渲染、无计数变化——一次点击仍计 1 次 usage）。
- ZIP（`buildZipBlob`）：每壁纸文件夹 = 卖家渲染 5 张 + **原始文件 1 个**（原文件名、原字节；路径分隔符清洗）。删除 pure 三设备渲染。
- 删除 `PURE_DEVICES`、`Prefix` 类型；`deviceFileName(tag, originalName)` 硬编码 `seller-` 前缀。
- i18n：`card.deliver`='下载交付图'/'Download delivery image' 新增；`card.pureSet`、`card.original` 删除（zh+en 同步删）。

### 2. 主色提取（`src/lib/render/color.ts`，纯函数可单测）

```ts
export type RGB = [number, number, number]
export interface GradientStops { from: RGB; to: RGB }

/** 区域平均色（像素区间 [startPixel, startPixel+pixelCount)），透明像素跳过，全透明回退 [128,128,128] */
export function averageColor(data: Uint8ClampedArray, startPixel: number, pixelCount: number): RGB

/** 左区微提亮、右区微压深 → 渐变起止：from=mix(left,black,0.28)，to=mix(right,white,0.42) */
export function gradientStops(left: RGB, right: RGB): GradientStops

/** 浏览器端：图片 cover 采样到 48×48，左半/右半各取平均 → gradientStops */
export function extractGradientStops(img: HTMLImageElement): GradientStops
```

### 3. 场景化渲染（canvas.ts + devices.ts）

- `devices.ts` 新增 `sceneDims(def): { width, height }`：设备尺寸 + 四周留白（padX = round(width*0.14)，padY = round(height*0.14)，min 24）。
- `RenderOptions` 新增 `backdrop?: GradientStops`（renderSellerScene 必填）。
- 新增 `renderSellerScene(img, kind, opts): HTMLCanvasElement`：
  1. canvas = sceneDims × scale；
  2. 160° 线性渐变铺满（from→to）；
  3. `translate(padX, padY + shadowOffsetY)` + 柔和投影（shadowColor rgba(15,15,20,0.4)、blur ≈ width*0.05）后调用 `paintDevice(ctx, def, img, opts, 1)`（外层已 setTransform scale）。
  4. `renderDeviceImage`（纯设备、无背景）保留不动，兼容现有测试。
- ImageCard 预览：`renderSellerScene(img, kind, { showTime: true, now, backdrop: extractGradientStops(img) })`；backdrop 每个 img 只算一次（previews useMemo 内）。
- ImageCard 预览图尺寸改用 `sceneDims(DEVICE_DEFS[kind])`。

### 4. 完整锁屏界面（仅 showTime=true 路径）

重做 `drawClock` 为 `drawLockScreen(ctx, def, now)`，全部尺寸按屏幕比例：

- **通用**：日期 + 大时钟顶部居中。timeFont = round(screen.h*0.085)（iPhone≈31），dateFont = round(timeFont*0.36)。阴影保留。
- **iPhone 追加**：
  - 状态栏（高 = screen.h*0.045）：左侧小时间（formatLockTime，dateFont*0.9），右侧信号条（4 根递增圆角竖条）+ WiFi（双弧+点）+ 电池（圆角框+电量填充+正极帽），白色。
  - 底部：两个玻璃圆钮（圆心 y = screen 底部 - h*0.09，半径 h*0.045，x 在 25%/75%，rgba(255,255,255,0.28) 圆 + 内嵌手电筒/相机简笔图标）。
  - home 指示条（宽 40%、厚 h*0.008、圆角、白 85%、底部 -h*0.02）。
- **iPad 横/竖、MacBook、iMac**：仅日期+时间顶部居中（MacBook 刘海、底座等硬件元素维持现状）。
- 测试同步更新：paintDevice(showTime=true) iPhone fillText=3（日期+时间+状态栏小时间），其余设备=2；showTime=false 全 0。

### 5. generate.ts / batch.ts 联动

- `renderDeviceBlob(img, meta, originalName)`：改用 `renderSellerScene`（backdrop 由调用方算好传入？不——renderDeviceBlob 自己调 `extractGradientStops(img)`，每图一次）。
- `downloadDeviceImage` / `downloadDeviceSet`：去掉 prefix 参数（恒 seller）。

## 错误处理

- 渐变/锁屏绘制失败仍走既有单设备 try/catch（预览单设备失败占位、ZIP skipped 计数）。
- `extractGradientStops` 在零尺寸图上的行为依赖 drawCover 守卫 + averageColor 回退灰。

## 测试

- `color.test.ts`：averageColor（已知像素数组求均值、透明跳过、全透明回退）、gradientStops（mix 数学精确值）、左右分区区间计算。
- `canvas.test.ts` 更新：新 fillText 计数（iphone=3 / 其他=2 / false=0）、新增 renderSellerScene 画布尺寸 = sceneDims×scale 用例（扩 stub：translate/setTransform/shadow 属性存根）。
- 既有 45 用例保持绿（i18n 词条删除需 zh/en 同步）。

## 非目标

- 不做 3D 写实/透视倾斜（Canvas 2D 平面精修）。
- 不改变设备几何（用户已认可细边框）。
- 不动分页/批量/ZIP 打包流程（仅 ZIP 内容从 5+3 变 5+1）。
