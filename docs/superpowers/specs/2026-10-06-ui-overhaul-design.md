# 设备预览图生成工具 — UI 全面升级设计（第二轮）

> 第一轮 spec：`2026-10-06-device-mockup-studio-design.md`。本文档只描述本轮变更。

**目标：** 瀑布流布局、极光动态背景、失败态优化、设备描边细化、删除二次确认、shadcn/ui 组件化、中英双语。

**技术栈：** Next.js 14 App Router（静态导出）、TailwindCSS 3.4、shadcn/ui（Radix 无头）、轻量自研 i18n（React Context + 字典，不引入 next-intl）。

---

## 1. 瀑布流布局

- 图片卡片列表由垂直堆叠改为 CSS 多列：`columns-1 sm:columns-2 xl:columns-3`，卡片 `break-inside-avoid mb-4`。
- 纯 CSS 零 JS。已知取舍：列内纵向填充顺序（第 1 列满后才进第 2 列），已接受。
- 空状态提示保留在多列容器内。

## 2. 极光动态背景

- `globals.css` 新增 `.aurora-background`：fixed 定位、`z-index: -1`、`overflow: hidden`，内含 3–4 个超大径向渐变色斑（青 #67E8F9、紫 #C4B5FD、粉 #F9A8D4、橙 #FDBA74），`filter: blur(80–120px)`。
- 每个色斑一个 `@keyframes`，40–60s 无限循环平移/缩放，错峰延迟。
- 内容卡片保持近白实底（bg-white）+ 现有阴影，保证可读性；背景仅透出卡片间隙。
- 纯 CSS，无 canvas/JS，性能开销可忽略。

## 3. 失败态优化

当前问题：blob 解码失败时卡片顶部缩略图渲染浏览器裂图（截图 6.png），且失败文案单薄。

- **加载中**：缩略图区域显示骨架占位（脉冲动画），不显示 `<img>` 直至解码成功。
- **解码失败**：显示占位图标 + 「图片读取失败，可能已损坏」+「重试」按钮（重新 `blobToImage`）+「删除」按钮（走二次确认）。缩略图 `<img>` 仅在 `img` state 就绪后挂载，杜绝裂图。
- **单设备预览隔离**：`previews` 的 `map` 内对每个 `renderDeviceImage` 调用包 try/catch，失败设备渲染占位块，不影响同组其他设备；整组全败时显示失败提示条。
- **下载失败**：`alert()` 替换为 Sonner error toast（见 §6）。

## 4. 设备描边细化

`src/lib/render/devices.ts` 边框收窄 + 质感升级（`src/lib/render/canvas.ts` 的 `paintDevice` 外框绘制逻辑同步改）：

| 设备 | 现 bezel | 新 bezel |
|---|---|---|
| iphone | 7px 纯黑 | 3px，深灰→黑渐变 |
| ipad 横/竖 | 15px 纯黑 | 8px，深灰→黑渐变 |
| macbook | 14–19px | 8px 屏幕边 + 底座渐变微调 |
| imac | 12–15px | 8px 屏幕边，下巴收窄至 26px |

- 屏幕圆角半径随 bezel 收窄同步调小（iphone 30→24，ipad 16→12）。
- 现有 canvas 单测中断言描边宽度的用例需同步更新数值。
- 已知遗留：MacBook/iMac 导出底部深色窄带（几何留白）本轮顺手收窄底座高度消除。

## 5. 删除二次确认

- 引入 shadcn `AlertDialog`：标题「删除图片」，内容「确定删除「{文件名}」吗？此操作不可恢复。」，取消 / 确认（destructive 玫红）。
- 确认后调用原有 `onDelete`；失败卡片的「删除」按钮同样走二次确认。
- 焦点归还、Escape 关闭由 Radix 自动处理。

## 6. shadcn/ui 接入

**配置**（全部手写，非交互式）：`components.json`、`src/lib/utils.ts`（`cn()`）、`src/components/ui/` 下生成 `button.tsx`、`dialog.tsx`、`alert-dialog.tsx`、`sonner.tsx`。

**依赖**：`@radix-ui/react-dialog`、`@radix-ui/react-alert-dialog`、`sonner`、`class-variance-authority`、`clsx`、`tailwind-merge`、`lucide-react`。

**主题**：`globals.css` 的 `:root` 增加 shadcn CSS 变量，`--primary` 映射品牌橙（oklch 由 `brand.500` 换算）、`--destructive` 映射玫红、`--radius` 0.75rem。保留现有 Tailwind 品牌色令牌（bg-brand-500 等仍可用）。`tailwind.config.ts` 同步加 `borderRadius.lg/md/sm` 与 CSS 变量挂钩、`colors` 挂 `hsl(var(--...))`。

**组件替换**：
- 所有按钮 → `Button`（size sm，variant default/secondary/destructive/ghost）
- 打赏弹窗 → `Dialog`（替代自研 DonateModal 的遮罩/焦点逻辑，内容不变）
- 删除确认 → `AlertDialog`
- 自研 Toasts → Sonner `<Toaster richColors position="top-center">`，现有 `toast()` 调用点改为 `sonner` 的 `toast.success/error`
- 上传区按钮 → `Button`

## 7. 多语言（中文 + English）

- `src/lib/i18n/`：`zh.ts`、`en.ts` 字典（嵌套对象，全量 UI 文案：标题、按钮、提示、弹窗、失败态、计数），`index.ts` 导出 `Locale` 类型、`dictionaries`、`detectLocale()`（读 `navigator.language`，`zh*`→zh，其他→en）、`getDictionary(locale)`。
- `src/lib/i18n/context.tsx`：`I18nProvider`（state: locale，初始 `detectLocale()`，localStorage 键 `mockup-locale`）+ `useI18n()` hook 返回 `{ locale, setLocale, t }`，`t` 支持点路径取值（如 `t('card.delete')`，缺键回退中文字典）。
- Header 加语言切换（中/EN 两个文字按钮或 `Languages` lucide 图标 + 下拉），切换即生效并持久化。
- 设备 `label`（iPhone/iPad 横屏…）与文件名中的设备 tag 不改（文件名规范已由用户锁定 `pure-/seller-` 前缀 + 设备 tag 用英文小写）。
- 日期时间格式保持英文锁定屏格式（业务需求，不随 locale 变）。
- 字典文件为纯数据，补单测：中英 key 集合一致、`t()` 点路径解析与回退行为。

## 8. 附带修复

- `package.json` 增加 `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }`，解决 pnpm 11 拦截 esbuild 构建脚本导致 `pnpm test`/`pnpm dev` 前置检查失败的问题。
- 依赖统一用 pnpm 管理（用户已切换）。

## 测试

- 更新 canvas 描边/几何相关断言（devices.ts 数值变更）。
- 新增 i18n 单测（字典 key 一致性、t 解析回退）。
- 既有 19 个测试保持通过。
- 手工验证清单：瀑布流多列、极光动画、上传裂图场景、删除二次确认、语言切换、下载文件名规范不变。
