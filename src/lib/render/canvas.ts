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
  const grad = ctx.createLinearGradient(0, baseY, 0, baseY + 22)
  grad.addColorStop(0, '#e8e8ec')
  grad.addColorStop(1, '#c8c8cf')
  ctx.fillStyle = grad
  roundedRectPath(ctx, 6, baseY, width - 12, 22, 6)
  ctx.fill()
  ctx.fillStyle = '#b4b4bc'
  roundedRectPath(ctx, width / 2 - 34, baseY + 4, 68, 14, 4)
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
  const grad = ctx.createLinearGradient(0, chinY, 0, chinY + 34)
  grad.addColorStop(0, '#ececee')
  grad.addColorStop(1, '#d4d4d9')
  ctx.fillStyle = grad
  ctx.fillRect(4, chinY, width - 8, 34)
  ctx.fillStyle = '#b9b9c0'
  ctx.beginPath()
  ctx.arc(width / 2, chinY + 17, 5, 0, Math.PI * 2)
  ctx.fill()
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

  ctx.fillStyle = '#101014'
  ctx.fillRect(0, 0, def.width, def.height)

  ctx.save()
  roundedRectPath(ctx, def.screen.x, def.screen.y, def.screen.w, def.screen.h, def.screenRadius)
  ctx.clip()
  drawCover(ctx, img, def.screen.x, def.screen.y, def.screen.w, def.screen.h)
  if (opts.showTime) drawClock(ctx, def, opts.now)
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
