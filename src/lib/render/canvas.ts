// src/lib/render/canvas.ts
// 锁屏贴图合成（壁纸 cover + 锁屏 UI）——供 Three.js 屏幕纹理使用。
// 2D 设备整机渲染（paintDevice/renderSellerScene 等）已移除，由 render/three.ts 取代。
import type { DeviceKind } from "../tokens";
import { formatLockDate, formatLockTime } from "../time";

export const EXPORT_SCALE = 4;

/** 锁屏贴图超采样倍数：日期/图标文字在高分屏与 4× 导出下保持锐利 */
const SUPERSAMPLE = 4;

/** 参与 Three.js 渲染的设备种类（iPad 竖屏 / iMac 已下线） */
export type ScreenKind = Extract<
  DeviceKind,
  "iphone" | "ipad-landscape" | "macbook"
>;

export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 圆角矩形路径（arcTo 实现，兼容所有 canvas 实现） */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** cover 居中裁剪绘制 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // 图片未解码或零尺寸时直接跳过，避免 Infinity/NaN 几何与 drawImage 抛错
  if (
    !(img as HTMLImageElement).naturalWidth ||
    !(img as HTMLImageElement).naturalHeight
  )
    return;
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

const FONT_STACK = '-apple-system, "Helvetica Neue", "Segoe UI", sans-serif';

/** lucide 24×24 描边图标 path 数据（lucide.dev，ISC License）——用 Path2D 绘制到锁屏贴图 */
const LUCIDE = {
  signal: "M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16",
  wifi: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  battery:
    "M2 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM22 11v2",
  flashlight:
    "M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12zM13 6v4M11 6v4M12 12v3",
  camera:
    "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM15 13a3 3 0 1 1-6 0a3 3 0 1 1 6 0",
};

/** 以描边方式绘制 lucide 图标（path 为 24×24 viewBox） */
function drawIcon(
  ctx: CanvasRenderingContext2D,
  d: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const path = new Path2D(d);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.stroke(path);
  ctx.restore();
}

/** iPhone 状态栏：左侧时间 + 右侧信号/WiFi/电池（lucide 图标，dark=浅色壁纸时使用深色） */
function drawStatusBar(
  ctx: CanvasRenderingContext2D,
  screen: ScreenRect,
  now: Date,
  dark: boolean,
): void {
  const { x, y, w } = screen;
  const barH = Math.max(14, Math.round(screen.h * 0.05));
  const iconH = barH * 0.52;
  const cy = y + barH / 2;
  const fg = dark ? "#1b1b1f" : "#ffffff";
  const stroke = dark ? "rgba(27,27,31,0.85)" : "rgba(255,255,255,0.9)";

  // 左侧时间
  ctx.save();
  ctx.font = `600 ${Math.round(barH * 0.55)}px ${FONT_STACK}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fg;
  ctx.fillText(formatLockTime(now), x + w * 0.09, cy);
  ctx.restore();

  // 右侧图标簇（从右往左：电池 → WiFi → 信号）
  const gap = iconH * 0.34;
  const bW = iconH * 1.45;
  const bx = x + w - w * 0.055 - bW;

  // 电池：lucide battery 轮廓 + 电量填充
  ctx.save();
  ctx.translate(bx, cy - iconH / 2);
  ctx.scale(bW / 24, iconH / 24);
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke;
  ctx.stroke(new Path2D(LUCIDE.battery));
  ctx.fillStyle = fg;
  roundedRectPath(ctx, 4, 9.5, 11.5 * 0.72, 5, 1.5);
  ctx.fill();
  ctx.restore();

  const wifiX = bx - gap - iconH;
  drawIcon(ctx, LUCIDE.wifi, wifiX, cy - iconH / 2, iconH, fg);
  const sigX = wifiX - gap - iconH * 0.9;
  drawIcon(ctx, LUCIDE.signal, sigX, cy - iconH / 2, iconH, fg);

  ctx.textAlign = "center";
}

/** iPhone 底部玻璃按钮（手电筒 + 相机，lucide 图标）与 home 指示条（dark=浅色壁纸时使用深色） */
function drawLockBottom(
  ctx: CanvasRenderingContext2D,
  screen: ScreenRect,
  dark: boolean,
): void {
  const { x, y, w, h } = screen;
  const r = h * 0.045;
  const pill = dark ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.28)";
  const iconColor = dark ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.9)";

  // 两个玻璃圆按钮
  ctx.save();
  ctx.shadowBlur = 0;
  for (const cx of [x + w * 0.25, x + w * 0.75]) {
    const cyc = y + h * 0.9;
    ctx.beginPath();
    ctx.arc(cx, cyc, r, 0, Math.PI * 2);
    ctx.fillStyle = pill;
    ctx.fill();
  }
  ctx.restore();

  // 手电筒 / 相机（lucide 描边图标）
  const iconSize = r * 1.15;
  const iconY = y + h * 0.9 - iconSize / 2;
  drawIcon(
    ctx,
    LUCIDE.flashlight,
    x + w * 0.25 - iconSize / 2,
    iconY,
    iconSize,
    iconColor,
  );
  drawIcon(
    ctx,
    LUCIDE.camera,
    x + w * 0.75 - iconSize / 2,
    iconY,
    iconSize,
    iconColor,
  );

  // home 指示条
  ctx.save();
  roundedRectPath(
    ctx,
    x + w * 0.32,
    y + h * 0.972,
    w * 0.36,
    Math.max(2.5, h * 0.008),
    h * 0.004,
  );
  ctx.fillStyle = iconColor;
  ctx.fill();
  ctx.restore();
}

/** 锁屏界面：日期+时间（所有设备），iPhone 额外有状态栏与底部按钮。
 *  dark=true 时使用深色文字（浅色/白色壁纸场景），保证可读性 */
export function drawLockScreen(
  ctx: CanvasRenderingContext2D,
  kind: DeviceKind,
  screen: ScreenRect,
  now: Date,
  dark = false,
): void {
  const { x, y, h } = screen;
  const cx = x + screen.w / 2;
  const timeFont = Math.max(12, Math.round(h * 0.085));
  const dateFont = Math.max(8, Math.round(timeFont * 0.36));

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6;
  ctx.fillStyle = dark ? "#1b1b1f" : "#ffffff";

  ctx.font = `600 ${dateFont}px ${FONT_STACK}`;
  ctx.fillText(formatLockDate(now), cx, y + h * 0.13);

  ctx.font = `700 ${timeFont}px ${FONT_STACK}`;
  ctx.fillText(formatLockTime(now), cx, y + h * 0.13 + timeFont * 0.95);
  ctx.restore();

  if (kind === "iphone") {
    drawStatusBar(ctx, screen, now, dark);
    drawLockBottom(ctx, screen, dark);
  }
}

/** 设备屏幕贴图基准尺寸（CSS px，composeLockScreen 以 2× 超采样输出） */
export const SCREEN_TEX_SIZE: Record<ScreenKind, { w: number; h: number }> = {
  iphone: { w: 390, h: 844 },
  "ipad-landscape": { w: 834, h: 590 },
  macbook: { w: 900, h: 562 },
};

/** 屏幕贴图圆角（CSS px，与设备边框圆角匹配，避免壁纸直角露出边框） */
export const SCREEN_RADIUS: Record<ScreenKind, number> = {
  iphone: 48,
  "ipad-landscape": 26,
  macbook: 18,
};

/** 采样日期/时钟文字区域的平均亮度（relative luminance）。
 *  偏亮（白底壁纸）返回 true，调用方应改用深色文字。采样失败时保守返回 false。 */
function needsDarkText(
  ctx: CanvasRenderingContext2D,
  base: { w: number; h: number },
): boolean {
  try {
    const px = SUPERSAMPLE;
    const sx = Math.round(base.w * px * 0.2);
    const sy = Math.round(base.h * px * 0.06);
    const sw = Math.round(base.w * px * 0.6);
    const sh = Math.round(base.h * px * 0.4);
    const { data } = ctx.getImageData(sx, sy, sw, sh);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      n += 1;
    }
    return n > 0 && sum / n > 0.72;
  } catch {
    return false;
  }
}

/** 合成锁屏贴图：壁纸 cover + 锁屏 UI，返回 3× 尺寸 canvas（供 Three.js CanvasTexture） */
export function composeLockScreen(
  img: HTMLImageElement,
  kind: ScreenKind,
  now: Date,
): HTMLCanvasElement {
  const base = SCREEN_TEX_SIZE[kind];
  const canvas = document.createElement("canvas");
  canvas.width = base.w * SUPERSAMPLE;
  canvas.height = base.h * SUPERSAMPLE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.scale(SUPERSAMPLE, SUPERSAMPLE);
  // 屏幕贴图按设备圆角裁剪：壁纸与锁屏 UI 都被裁成圆角，three.ts 侧开启 transparent 混合
  roundedRectPath(ctx, 0, 0, base.w, base.h, SCREEN_RADIUS[kind]);
  ctx.clip();
  drawCover(ctx, img, 0, 0, base.w, base.h);
  const dark = needsDarkText(ctx, base);
  drawLockScreen(ctx, kind, { x: 0, y: 0, w: base.w, h: base.h }, now, dark);
  return canvas;
}
