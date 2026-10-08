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
  // 图片未解码或零尺寸时直接跳过，避免 Infinity/NaN 几何与 drawImage 抛错
  if (!(img as HTMLImageElement).naturalWidth || !(img as HTMLImageElement).naturalHeight) return
  const s = Math.max(w / img.width, h / img.height)
  const dw = img.width * s
  const dh = img.height * s
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

const FONT_STACK = '-apple-system, "Helvetica Neue", "Segoe UI", sans-serif'

/** iPhone 状态栏：左侧时间 + 右侧电池/WiFi/信号图标 */
function drawStatusBar(ctx: CanvasRenderingContext2D, def: DeviceDef, now: Date): void {
  const { x, y, w, h } = def.screen
  const barH = Math.max(14, Math.round(h * 0.05))
  const iconH = barH * 0.42
  const cy = y + barH / 2

  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'

  // 左侧时间
  ctx.font = `600 ${Math.round(barH * 0.55)}px ${FONT_STACK}`
  ctx.textAlign = 'left'
  ctx.fillText(formatLockTime(now), x + w * 0.09, cy)

  // 右侧图标簇（从右往左排）
  const rx = x + w - w * 0.06
  const gap = iconH * 0.5
  // 电池
  const bw = w * 0.11
  const bx = rx - bw
  ctx.lineWidth = 1.5
  roundedRectPath(ctx, bx, cy - iconH / 2, bw, iconH, iconH * 0.3)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  roundedRectPath(ctx, bx + 1.5, cy - iconH / 2 + 1.5, (bw - 3) * 0.75, iconH - 3, iconH * 0.2)
  ctx.fill()
  ctx.fillRect(bx + bw + 1.5, cy - iconH * 0.25, 2, iconH * 0.5)
  // WiFi
  const wx = bx - gap - iconH
  ctx.beginPath()
  ctx.arc(wx + iconH / 2, cy + iconH * 0.3, iconH * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(wx + iconH / 2, cy + iconH * 0.3, iconH * 0.45, Math.PI * 1.15, Math.PI * 1.85)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(wx + iconH / 2, cy + iconH * 0.3, iconH * 0.72, Math.PI * 1.15, Math.PI * 1.85)
  ctx.lineWidth = iconH * 0.14
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  // 信号
  const sx = wx - gap - iconH * 0.9
  const barHeights = [0.35, 0.55, 0.75, 0.95]
  const bottom = cy + iconH * 0.45
  barHeights.forEach((p, i) => {
    const bh = iconH * p
    ctx.fillRect(sx + i * (2.5 + 1.5), bottom - bh, 2.5, bh)
  })
  ctx.restore()

  ctx.textAlign = 'center'
}

/** iPhone 底部玻璃按钮（手电筒 + 相机）与 home 指示条 */
function drawLockBottom(ctx: CanvasRenderingContext2D, def: DeviceDef): void {
  const { x, y, w, h } = def.screen
  const r = h * 0.045
  ctx.save()
  ctx.shadowBlur = 0

  // 两个玻璃圆按钮
  for (const cx of [x + w * 0.25, x + w * 0.75]) {
    const cyc = y + h * 0.9
    ctx.beginPath()
    ctx.arc(cx, cyc, r, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fill()
  }

  // 左：手电筒胶囊
  const lx = x + w * 0.25
  const ly = y + h * 0.9
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  roundedRectPath(ctx, lx - r * 0.25, ly - r * 0.45, r * 0.5, r * 0.9, r * 0.25)
  ctx.fill()

  // 右：相机
  const cx2 = x + w * 0.75
  const cy2 = y + h * 0.9
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = r * 0.12
  roundedRectPath(ctx, cx2 - r * 0.48, cy2 - r * 0.36, r * 0.96, r * 0.78, r * 0.2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx2, cy2 + r * 0.03, r * 0.26, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  roundedRectPath(ctx, cx2 - r * 0.16, cy2 - r * 0.5, r * 0.32, r * 0.16, r * 0.06)
  ctx.fill()

  // home 指示条
  roundedRectPath(ctx, x + w * 0.3, y + h * 0.972, w * 0.4, Math.max(2.5, h * 0.008), h * 0.004)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fill()
  ctx.restore()
}

/** 锁屏界面：日期+时间（所有设备），iPhone 额外有状态栏与底部按钮 */
function drawLockScreen(ctx: CanvasRenderingContext2D, def: DeviceDef, now: Date): void {
  const { x, y, w, h } = def.screen
  const cx = x + w / 2
  const timeFont = Math.max(12, Math.round(h * 0.085))
  const dateFont = Math.max(8, Math.round(timeFont * 0.36))

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 6
  ctx.fillStyle = '#ffffff'

  ctx.font = `600 ${dateFont}px ${FONT_STACK}`
  ctx.fillText(formatLockDate(now), cx, y + h * 0.13)

  ctx.font = `700 ${timeFont}px ${FONT_STACK}`
  ctx.fillText(formatLockTime(now), cx, y + h * 0.13 + timeFont * 0.95)
  ctx.restore()

  if (def.kind === 'iphone') {
    drawStatusBar(ctx, def, now)
    drawLockBottom(ctx, def)
  }
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

  const frameGrad = ctx.createLinearGradient(0, 0, def.width, def.height)
  frameGrad.addColorStop(0, '#2a2a31')
  frameGrad.addColorStop(0.5, '#121216')
  frameGrad.addColorStop(1, '#1e1e24')
  ctx.fillStyle = frameGrad
  ctx.fillRect(0, 0, def.width, def.height)

  ctx.save()
  roundedRectPath(ctx, def.screen.x, def.screen.y, def.screen.w, def.screen.h, def.screenRadius)
  ctx.clip()
  drawCover(ctx, img, def.screen.x, def.screen.y, def.screen.w, def.screen.h)
  if (opts.showTime) drawLockScreen(ctx, def, opts.now)
  ctx.restore()

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
