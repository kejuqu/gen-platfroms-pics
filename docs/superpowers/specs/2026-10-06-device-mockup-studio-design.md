# 设备预览图生成工具（Device Mockup Studio）设计文档

日期：2026-10-06
状态：已获用户确认

## 1. 背景与目标

用户经营虚拟图片商品（壁纸类），需要一款纯浏览器工具：

1. 上传多张原始壁纸图片；
2. 自动为每张原图生成多种设备（iPhone / iPad 横竖 / MacBook / iMac）的预览图，预览图**自动显示当前时间**（英文格式，如 "Wednesday, May 20" + "19:16"），用于电商售卖展示；
3. 同时提供**不带时间的设备图**（固定三张：iPhone、iPad 横屏、MacBook），用于最终交付给买家；
4. 支持下载所有预览图、交付三图和原图；
5. 使用 IndexedDB 本地存储原图；
6. 超过每月 15 张生成量后，每 15 天提醒一次打赏；页面常驻打赏按钮，弹窗展示支付宝/微信二维码；
7. UI 主题色为桔色 + 玫瑰红，TailwindCSS + Design Tokens。

参考视觉：用户提供的 5 张截图（iPhone 竖屏带 Dynamic Island 与时间、iPad 横竖、MacBook 带键盘底座、iMac 带下巴支架）。

## 2. 技术方案

**已确认：方案 A — Canvas 2D 全程绘制（单一真实来源）**

- 设备外框、壁纸、时钟文字全部用 Canvas 2D API 绘制；
- UI 中的预览 = canvas 本身（`toDataURL` 缩略或直接显示 canvas），下载 = `canvas.toBlob()` 导出 PNG；
- 预览与导出 100% 一致，无字体加载 / foreignObject / 跨域问题；
- 可输出 2x 高清分辨率（如 iPhone 导出约 1290×2796 级别）。

技术栈：

- Next.js 14 App Router，纯客户端组件（`output: 'export'` 静态导出，可部署任意静态托管）；
- TailwindCSS + Design Tokens；
- IndexedDB 通过 `idb` 封装；
- 测试：vitest + fake-indexeddb。

## 3. 页面布局（单页应用）

### ① 顶部导航栏
- 左侧 Logo / 标题；
- 右侧「☕ 打赏支持」常驻按钮（玫瑰红渐变）；
- 下方小字：`本月已生成 N / 15 张`。

### ② 上传区
- 大号虚线拖拽区（桔色边框），支持多选 / 拖拽 JPG、PNG、WEBP；
- 上传后立即写入 IndexedDB；每张图渲染缩略图卡片（缩略图 + 文件名 + 删除按钮）。

### ③ 工作台（每张原图一张卡片）
- 卡片内横向滚动展示 5 张预览图：iPhone 竖 / iPad 横 / iPad 竖 / MacBook / iMac；
- 每张预览图下方标注设备名，悬停浮现「下载 PNG」按钮；
- 卡片右上角操作：
  - 「下载全部预览图」— 带时间的 5 张 PNG 逐个下载；
  - 「下载交付三图」— 无时间的 iPhone + iPad 横 + MacBook 三张；
  - 「下载原图」。

### ④ 预览图绘制细节
- 时间显示：自动取**当前时间**，英文格式（"Wednesday, May 20" 小号字 + "HH:MM" 大号加粗白字），位置与参考截图一致（屏幕顶部居中）；
- 壁纸绘制：cover 居中裁剪填满屏幕，屏幕圆角处用 clip 裁切；
- iPhone：竖屏圆角 + Dynamic Island 黑条；
- iPad：横屏与竖屏两种；
- MacBook：含键盘底座；
- iMac：含底部下巴与支架；
- 无时间版：与预览版同设备构图，仅不绘制时间文字。

### ⑤ 打赏系统
- 常驻按钮 → 弹窗并排展示支付宝、微信二维码（读 `public/donate/alipay.png` 与 `public/donate/wechat.png`，图片缺失时显示「图片待补充」占位）；
- 自动提醒：本月生成数 > 15 **且**距离上次提醒 ≥ 15 天 → 打开页面时自动弹出一次；localStorage 记录 `lastDonateReminder`，当天只弹一次；
- 超限**只提醒不阻断**，不限制继续使用。

### ⑥ IndexedDB 数据结构
```
images 表: { id: string, name: string, blob: Blob, createdAt: number }
usage 表:  { id: 'usage', month: 'YYYY-MM', count: number, lastReminder: number }
```
所有数据仅存浏览器本地；换浏览器或清缓存会丢失（符合纯前端定位）。

### ⑦ 下载命名规则（用户明确指定）
- 无时间版（交付三图）：`pure-<设备名>-<原图名>.png`
- 售卖预览版（带时间五张）：`seller-<设备名>-<原图名>.png`
- 原图：保持原始文件名下载

## 4. Design Tokens

```
color:
  brand-orange  50–900   主色（上传区、主按钮）
  brand-rose    50–900   打赏、强调、悬停态
  ink                    文字主色（暖黑）
  surface                卡片背景（暖白）
radius:
  card 16px / device-thumb 20px
shadow:
  card 柔和投影（橙色调）
font:
  UI 中文系统字体栈
```

Tailwind 配置与 CSS 变量双通道输出。

## 5. 错误处理

- 上传非图片文件 → toast 提示并跳过该文件，其余继续；
- IndexedDB 写入失败（如空间不足）→ toast 警告，保留内存副本；
- 读取图片失败 → 卡片显示「图片丢失」占位，可删除；
- 单张预览绘制失败 → 显示错误占位，不影响同卡其他设备。

## 6. 测试策略

- `canvas-render.ts` 各设备绘制器单元测试（vitest，断言 canvas 非空、尺寸正确）；
- IndexedDB 封装 CRUD 测试（fake-indexeddb）；
- 使用次数 / 提醒逻辑边界测试（跨月清零、15 天间隔判断）。

## 7. 已确认的默认决策

- 预览图时间 = 当前真实时间，英文格式，不可编辑；
- 无时间版 iPad 采用横屏；
- 「下载全部预览图」= 5 个 PNG 逐个下载（不引入 ZIP 库）；
- 超限行为：仅提醒，不阻断。
